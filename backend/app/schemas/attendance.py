from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import date


class AttendanceCreate(BaseModel):
    trainee_id: UUID
    attendance_date: date
    is_present: bool


class AttendanceUpdate(BaseModel):
    is_present: bool


class AttendanceResponse(BaseModel):
    id: UUID
    trainee_id: UUID
    attendance_date: date
    is_present: bool

    model_config = ConfigDict(from_attributes=True)
