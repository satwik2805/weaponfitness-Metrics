from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional


class TraineeBase(BaseModel):
    # client-settable fields only
    trainer_id: Optional[UUID] = None
    bmi: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None


class TraineeCreate(TraineeBase):
    id: UUID


class TraineeUpdate(TraineeBase):
    pass


class TraineeResponse(TraineeBase):
    id: UUID
    created_at: datetime
    # server-owned, read-only: never accepted from the client. XP/level move
    # only through gamification_service (audit WF-040 / review R-023).
    xp: Optional[int] = 0
    level: Optional[int] = 1
    last_absent_email_sent: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
