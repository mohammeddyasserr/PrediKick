from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.match_sync import sync_matches
import os


router = APIRouter(
    prefix="/internal",
    tags=["Internal"]
)


@router.get("/sync-matches")
def sync_matches_endpoint(
    db: Session = Depends(get_db),
    x_cron_secret: str | None = Header(default=None)
):

    expected_secret = os.getenv("CRON_SECRET")

    if not expected_secret or x_cron_secret != expected_secret:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized"
        )

    result = sync_matches(db)

    return {
        "message": "Match synchronization completed",
        **result
    }