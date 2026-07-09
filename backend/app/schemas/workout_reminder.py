# app/schemas/workout_reminder.py
from pydantic import BaseModel
from uuid import UUID
from datetime import time, datetime
from typing import Optional

class WorkoutReminderBase(BaseModel):
    trainee_id: UUID
    reminder_time: time
    days_of_week: Optional[str] = None  # "Monday,Wednesday,Friday" or None for all days
    message: Optional[str] = None
    is_active: bool = True

class WorkoutReminderCreate(WorkoutReminderBase):
    pass

class WorkoutReminderUpdate(BaseModel):
    reminder_time: Optional[time] = None
    days_of_week: Optional[str] = None
    message: Optional[str] = None
    is_active: Optional[bool] = None

class WorkoutReminderResponse(WorkoutReminderBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
