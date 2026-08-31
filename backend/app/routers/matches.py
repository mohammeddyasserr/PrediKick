from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import os
from app.database import get_db
from app.models.match import Match
from app.models.prediction import Prediction
from app.models.profiles import Profile
from app.schemas.match import (
    MatchCreate,
    MatchUpdate,
    TEAM_NAMES,
    Team
)
from app.dependencies.auth import (
    get_current_user,
    require_admin
)


router = APIRouter(
    prefix="/matches",
    tags=["Matches"]
)


# =========================
# CALCULATE PREDICTION POINTS
# =========================

def calculate_prediction_points(
    predicted_h: int,
    predicted_a: int,
    actual_h: int,
    actual_a: int
):
    # Exact score
    if (
        predicted_h == actual_h
        and predicted_a == actual_a
    ):
        return 2

    # 1  = home win
    # 0  = draw
    # -1 = away win

    predicted_result = (
        1 if predicted_h > predicted_a
        else -1 if predicted_h < predicted_a
        else 0
    )

    actual_result = (
        1 if actual_h > actual_a
        else -1 if actual_h < actual_a
        else 0
    )

    # Correct result
    if predicted_result == actual_result:
        return 1

    # Wrong result
    return 0


SUPABASE_URL = os.getenv("SUPABASE_URL")


def get_team_logo(team_id: int):
    return (
        f"{SUPABASE_URL}/storage/v1/object/public/"
        f"teams-logos/{team_id}.png"
    )


# =========================
# GET ALL MATCHES
# =========================

@router.get("/")
def get_matches(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    matches = (
        db.query(Match)
        .order_by(
            Match.event,
            Match.kickoff_time
        )
        .all()
    )

    return [
        {
            "id": match.id,

            "event": match.event,

            "team_h": match.team_h,
            "team_h_name": TEAM_NAMES[Team(match.team_h)],
            "team_h_score": match.team_h_score,
            "team_h_logo": get_team_logo(match.team_h),

            "team_a": match.team_a,
            "team_a_name": TEAM_NAMES[Team(match.team_a)],
            "team_a_logo": get_team_logo(match.team_a),
            "team_a_score": match.team_a_score,

            "kickoff_time": match.kickoff_time,

            "status": match.status
        }
        for match in matches
    ]


# =========================
# CREATE MATCH - ADMIN ONLY
# =========================

@router.post("/")
def create_match(
    data: MatchCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    if data.team_h == data.team_a:
        raise HTTPException(
            status_code=400,
            detail="Home and away teams cannot be the same"
        )

    match = Match(
        team_h=data.team_h.value,
        team_a=data.team_a.value,
        event=data.event,
        kickoff_time=data.kickoff_time,
        status="scheduled"
    )

    db.add(match)
    db.commit()
    db.refresh(match)

    return {
        "id": match.id,
        "event": match.event,

        "team_h": match.team_h,
        "team_h_name": TEAM_NAMES[Team(match.team_h)],
        "team_h_score": match.team_h_score,

        "team_a": match.team_a,
        "team_a_name": TEAM_NAMES[Team(match.team_a)],
        "team_a_score": match.team_a_score,

        "kickoff_time": match.kickoff_time,
        "status": match.status
    }


# =========================
# UPDATE MATCH - ADMIN ONLY
# =========================

@router.put("/{match_id}")
def update_match(
    match_id: int,
    data: MatchUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    match = (
        db.query(Match)
        .filter(Match.id == match_id)
        .first()
    )

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Match not found"
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    # =========================
    # CONVERT ENUM → INTEGER
    # =========================

    if "team_h" in update_data:
        update_data["team_h"] = update_data["team_h"].value

    if "team_a" in update_data:
        update_data["team_a"] = update_data["team_a"].value

    # =========================
    # VALIDATE TEAMS
    # =========================

    new_team_h = update_data.get(
        "team_h",
        match.team_h
    )

    new_team_a = update_data.get(
        "team_a",
        match.team_a
    )

    if new_team_h == new_team_a:
        raise HTTPException(
            status_code=400,
            detail="Home and away teams cannot be the same"
        )

    # =========================
    # NEW MATCH VALUES
    # =========================

    new_status = update_data.get(
        "status",
        match.status
    )

    new_team_h_score = update_data.get(
        "team_h_score",
        match.team_h_score
    )

    new_team_a_score = update_data.get(
        "team_a_score",
        match.team_a_score
    )

    # =========================
    # VALIDATE ENDED MATCH
    # =========================

    if new_status == "ended":

        if (
            new_team_h_score is None
            or new_team_a_score is None
        ):
            raise HTTPException(
                status_code=400,
                detail="Ended match must have both scores"
            )

        if (
            new_team_h_score < 0
            or new_team_a_score < 0
        ):
            raise HTTPException(
                status_code=400,
                detail="Scores cannot be negative"
            )

    # =========================
    # UPDATE MATCH
    # =========================

    for field, value in update_data.items():
        setattr(match, field, value)

    # =========================
    # RECALCULATE POINTS
    # =========================

    if (
        new_status == "ended"
        and new_team_h_score is not None
        and new_team_a_score is not None
    ):

        predictions = (
            db.query(Prediction)
            .filter(
                Prediction.match_id == match.id
            )
            .all()
        )

        for prediction in predictions:

            # -------------------------
            # REMOVE OLD POINTS
            # -------------------------

            if prediction.points_calculated:

                profile = (
                    db.query(Profile)
                    .filter(
                        Profile.id == prediction.user_id
                    )
                    .first()
                )

                if profile:
                    profile.total_points -= prediction.points

            # -------------------------
            # CALCULATE NEW POINTS
            # -------------------------

            new_points = calculate_prediction_points(
                prediction.predicted_team_h_score,
                prediction.predicted_team_a_score,
                new_team_h_score,
                new_team_a_score
            )

            # -------------------------
            # SAVE NEW POINTS
            # -------------------------

            prediction.points = new_points
            prediction.points_calculated = True

            # -------------------------
            # ADD NEW POINTS
            # -------------------------

            profile = (
                db.query(Profile)
                .filter(
                    Profile.id == prediction.user_id
                )
                .first()
            )

            if profile:
                profile.total_points += new_points

    db.commit()
    db.refresh(match)

    return {
        "id": match.id,
        "event": match.event,

        "team_h": match.team_h,
        "team_h_name": TEAM_NAMES[Team(match.team_h)],
        "team_h_score": match.team_h_score,

        "team_a": match.team_a,
        "team_a_name": TEAM_NAMES[Team(match.team_a)],
        "team_a_score": match.team_a_score,

        "kickoff_time": match.kickoff_time,
        "status": match.status
    }


# =========================
# DELETE MATCH - ADMIN ONLY
# =========================

@router.delete("/{match_id}")
def delete_match(
    match_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    match = (
        db.query(Match)
        .filter(Match.id == match_id)
        .first()
    )

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Match not found"
        )

    db.delete(match)
    db.commit()

    return {
        "message": "Match deleted successfully"
    }
