from sqlalchemy import Column, Integer, DateTime, String

from app.database import Base


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)

    team_h = Column(Integer, nullable=False)

    team_a = Column(Integer, nullable=False)

    event = Column(Integer, nullable=False)

    kickoff_time = Column(
        DateTime(timezone=True),
        nullable=False
    )

    team_h_score = Column(
        Integer,
        nullable=True
    )

    team_a_score = Column(
        Integer,
        nullable=True
    )

    status = Column(
        String,
        nullable=False,
        default="scheduled"
    )