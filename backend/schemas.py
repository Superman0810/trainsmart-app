from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class OnboardingRequest(BaseModel):
    name: str
    race_type: str
    race_date: date
    age: int
    weight_kg: float
    height_cm: float
    experience_level: str
    days_per_week: int
    session_duration_min: int
    equipment: list[str]
    injuries: Optional[str] = None
    terrain: str


class SessionLogRequest(BaseModel):
    status: str
    rpe: Optional[int] = None
    notes: Optional[str] = None


class AdaptRequest(BaseModel):
    plan_id: int
    type: str
    start_date: date
    end_date: date
    details: Optional[str] = None


class SessionOut(BaseModel):
    id: int
    week_number: int
    date: date
    type: str
    phase: Optional[str]
    title: str
    description: Optional[str]
    duration_min: Optional[int]
    distance_km: Optional[float]
    intensity: Optional[str]
    log: Optional[dict] = None

    model_config = {"from_attributes": True}


class PlanOut(BaseModel):
    id: int
    user_id: int
    goal_id: int
    created_at: datetime
    sessions: list[SessionOut]

    model_config = {"from_attributes": True}
