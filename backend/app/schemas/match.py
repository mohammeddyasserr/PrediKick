from datetime import datetime
from enum import IntEnum

from pydantic import BaseModel


class Team(IntEnum):
    ARSENAL = 1
    ASTON_VILLA = 2
    BOURNEMOUTH = 3
    BRENTFORD = 4
    BRIGHTON = 5
    CHELSEA = 6
    COVENTRY_CITY = 7
    CRYSTAL_PALACE = 8
    EVERTON = 9
    FULHAM = 10
    HULL_CITY = 11
    IPSWICH_TOWN = 12
    LEEDS = 13
    LIVERPOOL = 14
    MAN_CITY = 15
    MAN_UTD = 16
    NEWCASTLE = 17
    NOTTINGHAM_FOREST = 18
    SPURS = 19
    SUNDERLAND = 20


TEAM_NAMES = {
    Team.ARSENAL: "Arsenal",
    Team.ASTON_VILLA: "Aston Villa",
    Team.BOURNEMOUTH: "Bournemouth",
    Team.BRENTFORD: "Brentford",
    Team.BRIGHTON: "Brighton",
    Team.CHELSEA: "Chelsea",
    Team.COVENTRY_CITY: "Coventry City",
    Team.CRYSTAL_PALACE: "Crystal Palace",
    Team.EVERTON: "Everton",
    Team.FULHAM: "Fulham",
    Team.HULL_CITY: "Hull City",
    Team.IPSWICH_TOWN: "Ipswich Town",
    Team.LEEDS: "Leeds",
    Team.LIVERPOOL: "Liverpool",
    Team.MAN_CITY: "Man City",
    Team.MAN_UTD: "Man Utd",
    Team.NEWCASTLE: "Newcastle",
    Team.NOTTINGHAM_FOREST: "Nott'm Forest",
    Team.SPURS: "Spurs",
    Team.SUNDERLAND: "Sunderland",
}


class MatchCreate(BaseModel):
    team_h: Team
    team_a: Team
    event: int
    kickoff_time: datetime


class MatchUpdate(BaseModel):
    team_h: Team | None = None
    team_a: Team | None = None
    event: int | None = None
    kickoff_time: datetime | None = None
    team_h_score: int | None = None
    team_a_score: int | None = None
    status: str | None = None