from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import date


class TrainerAttendanceCreate(BaseModel):
    trainer_id: UUID
    attendance_date: date
    is_present: bool


class TrainerAttendanceUpdate(BaseModel):
    is_present: bool


class TrainerAttendanceResponse(BaseModel):
    id: UUID
    trainer_id: UUID
    attendance_date: date
    is_present: bool

    model_config = ConfigDict(from_attributes=True)
