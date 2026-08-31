from pydantic import BaseModel
from uuid import UUID


class ProfileRank(BaseModel):
    id: UUID
    username: str
    total_points: int
    rank: int

    model_config = {
        "orm_mode": True
    }
