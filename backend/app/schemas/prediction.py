from pydantic import BaseModel, Field


class PredictionCreate(BaseModel):
    match_id: int

    predicted_team_h_score: int = Field(
        ge=0,
        description="Predicted home team score"
    )

    predicted_team_a_score: int = Field(
        ge=0,
        description="Predicted away team score"
    )


class PredictionResponse(BaseModel):
    id: int
    match_id: int

    predicted_team_h_score: int
    predicted_team_a_score: int

    points: int
    points_calculated: bool

    class Config:
        from_attributes = True
