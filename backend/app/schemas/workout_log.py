# app/schemas/workout_log.py
from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime
from typing import Optional

class WorkoutLogBase(BaseModel):
    trainee_id: UUID
    workout_date: date
    workout_template_id: Optional[UUID] = None
    attendance_id: Optional[UUID] = None
    is_completed: bool = True
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    auto_tracked: bool = True

class WorkoutLogCreate(WorkoutLogBase):
    pass

class WorkoutLogUpdate(BaseModel):
    is_completed: Optional[bool] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None

class WorkoutLogResponse(WorkoutLogBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
