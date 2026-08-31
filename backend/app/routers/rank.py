from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.profiles import Profile
from app.schemas.profile import ProfileRank


router = APIRouter(prefix="/rank", tags=["Rank"])


@router.get("/")
def get_rank(db: Session = Depends(get_db)):
    profiles = (
        db.query(Profile)
        .order_by(Profile.total_points.desc())
        .all()
    )

    result = []
    last_points = None
    last_rank = 0
    items_seen = 0

    for p in profiles:
        items_seen += 1

        if p.total_points != last_points:
            rank = items_seen
            last_points = p.total_points
            last_rank = rank
        else:
            rank = last_rank

        result.append(
            {
                "id": p.id,
                "username": p.username,
                "total_points": p.total_points,
                "rank": rank,
            }
        )

    return result


@router.get("/{username}")
def get_user_rank(username: str, db: Session = Depends(get_db)):
    profiles = (
        db.query(Profile)
        .order_by(Profile.total_points.desc())
        .all()
    )

    last_points = None
    last_rank = 0
    items_seen = 0

    for p in profiles:
        items_seen += 1

        if p.total_points != last_points:
            rank = items_seen
            last_points = p.total_points
            last_rank = rank
        else:
            rank = last_rank

        if p.username == username:
            return {
                "id": p.id,
                "username": p.username,
                "total_points": p.total_points,
                "rank": rank,
            }

    raise HTTPException(status_code=404, detail="User not found")
