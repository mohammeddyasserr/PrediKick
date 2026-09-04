import requests
from sqlalchemy.orm import Session

from app.models.match import Match
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

FPL_FIXTURES_URL= os.getenv("FPL_FIXTURES_URL")


def sync_matches(db: Session):

    response = requests.get(FPL_FIXTURES_URL, timeout=10)
    response.raise_for_status()

    api_matches = response.json()

    # Only matches that haven't started yet
    api_matches = [
        match for match in api_matches
        if match["started"] is False
    ]

    api_match_keys = set()

    updated_count = 0
    added_count = 0
    deleted_count = 0

    # Get scheduled matches from DB
    db_matches = (
        db.query(Match)
        .filter(Match.status == "scheduled")
        .all()
    )

    db_matches_by_teams = {
        (match.team_h, match.team_a): match
        for match in db_matches
    }

    # -----------------------------------
    # 1. Add / update matches
    # -----------------------------------

    for api_match in api_matches:

        team_h = api_match["team_h"]
        team_a = api_match["team_a"]

        key = (team_h, team_a)

        api_match_keys.add(key)

        match = db_matches_by_teams.get(key)

        # Match doesn't exist → ADD it
        if not match:

            kickoff = datetime.fromisoformat(
                api_match["kickoff_time"].replace("Z", "+00:00")
            )

            new_match = Match(
                team_h=team_h,
                team_a=team_a,
                event=api_match["event"],
                kickoff_time=kickoff,
                status="scheduled"
            )

            db.add(new_match)
            added_count += 1

            continue

        # Match exists → compare and update
        changed = False

        if match.event != api_match["event"]:
            match.event = api_match["event"]
            changed = True

        kickoff = datetime.fromisoformat(
            api_match["kickoff_time"].replace("Z", "+00:00")
        )

        if match.kickoff_time != kickoff:
            match.kickoff_time = kickoff
            changed = True

        if changed:
            updated_count += 1

    # -----------------------------------
    # 2. Delete scheduled DB matches
    #    no longer in API response
    # -----------------------------------

    for match in db_matches:

        key = (match.team_h, match.team_a)

        if key not in api_match_keys:
            db.delete(match)
            deleted_count += 1

    db.commit()

    return {
        "added": added_count,
        "updated": updated_count,
        "deleted": deleted_count,
    }