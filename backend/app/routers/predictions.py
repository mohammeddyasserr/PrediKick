from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.prediction import Prediction
from app.models.match import Match
from app.schemas.prediction import (
    PredictionCreate,
    PredictionUpdate,
    PredictionResponse
)
from app.dependencies.auth import get_current_user
from app.routers.matches import sync_matches_from_fpl


router = APIRouter(
    prefix="/predictions",
    tags=["Predictions"]
)


def _current_user_id(current_user):
    if hasattr(current_user, "id"):
        return current_user.id

    if isinstance(current_user, dict):
        return current_user.get("id") or current_user.get("sub")

    return None


# =========================
# CREATE PREDICTION
# =========================

@router.post(
    "/",
    response_model=PredictionResponse
)
def create_prediction(
    data: PredictionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = _current_user_id(current_user)

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid authenticated user"
        )

    # Check match exists
    match = (
        db.query(Match)
        .filter(Match.id == data.match_id)
        .first()
    )

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Match not found"
        )

    # Sync latest match status from FPL
    sync_matches_from_fpl(db)
    db.refresh(match)

    if match.status != "scheduled":
        raise HTTPException(
            status_code=400,
            detail="Cannot predict a match that has already started or ended"
        )

    # Check if user already predicted this match
    existing_prediction = (
        db.query(Prediction)
        .filter(
            Prediction.user_id == user_id,
            Prediction.match_id == data.match_id
        )
        .first()
    )

    if existing_prediction:
        raise HTTPException(
            status_code=400,
            detail="You already predicted this match"
        )

    prediction = Prediction(
        user_id=user_id,
        match_id=data.match_id,
        predicted_team_h_score=data.predicted_team_h_score,
        predicted_team_a_score=data.predicted_team_a_score,
        points=0,
        points_calculated=False
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return prediction


# =========================
# GET MY PREDICTIONS
# =========================

@router.get(
    "/",
    response_model=list[PredictionResponse]
)
def get_my_predictions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = _current_user_id(current_user)

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid authenticated user"
        )

    predictions = (
        db.query(Prediction)
        .filter(
            Prediction.user_id == user_id
        )
        .order_by(
            Prediction.created_at.desc()
        )
        .all()
    )

    return predictions


# =========================
# GET SINGLE PREDICTION
# =========================

@router.get(
    "/{prediction_id}",
    response_model=PredictionResponse
)
def get_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = _current_user_id(current_user)

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid authenticated user"
        )

    prediction = (
        db.query(Prediction)
        .filter(
            Prediction.id == prediction_id,
            Prediction.user_id == user_id
        )
        .first()
    )

    if not prediction:
        raise HTTPException(
            status_code=404,
            detail="Prediction not found"
        )

    return prediction


# =========================
# UPDATE PREDICTION
# =========================

@router.put(
    "/{prediction_id}",
    response_model=PredictionResponse
)
def update_prediction(
    prediction_id: int,
    data: PredictionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = _current_user_id(current_user)

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid authenticated user"
        )

    prediction = (
        db.query(Prediction)
        .filter(
            Prediction.id == prediction_id,
            Prediction.user_id == user_id
        )
        .first()
    )

    if not prediction:
        raise HTTPException(
            status_code=404,
            detail="Prediction not found"
        )

    # Get match
    match = (
        db.query(Match)
        .filter(
            Match.id == prediction.match_id
        )
        .first()
    )

    if not match:
        raise HTTPException(
            status_code=404,
            detail="Match not found"
        )

    # Sync latest match status from FPL
    sync_matches_from_fpl(db)
    db.refresh(match)

    if match.status != "scheduled":
        raise HTTPException(
            status_code=400,
            detail="Cannot modify prediction after match kickoff"
        )

    prediction.predicted_team_h_score = (
        data.predicted_team_h_score
    )

    prediction.predicted_team_a_score = (
        data.predicted_team_a_score
    )

    db.commit()
    db.refresh(prediction)

    return prediction
