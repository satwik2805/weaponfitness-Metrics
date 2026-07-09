from pydantic import BaseModel
from uuid import UUID
from datetime import time, datetime


class SleepReminderCreate(BaseModel):
    trainee_id: UUID
    bedtime: time


class SleepReminderResponse(BaseModel):
    id: UUID
    trainee_id: UUID
    bedtime: time
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
