from datetime import date, datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class GymClassCreate(BaseModel):
    branch_id: UUID
    trainer_id: Optional[UUID] = None
    title: str = Field(min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    weekday: int = Field(ge=0, le=6, description="0=Monday … 6=Sunday")
    start_time: time
    duration_minutes: int = Field(default=60, ge=10, le=240)
    capacity: int = Field(default=20, ge=1, le=500)


class GymClassUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    weekday: Optional[int] = Field(default=None, ge=0, le=6)
    start_time: Optional[time] = None
    duration_minutes: Optional[int] = Field(default=None, ge=10, le=240)
    capacity: Optional[int] = Field(default=None, ge=1, le=500)
    trainer_id: Optional[UUID] = None


class GymClassResponse(BaseModel):
    id: UUID
    branch_id: UUID
    trainer_id: Optional[UUID]
    title: str
    description: Optional[str]
    weekday: int
    start_time: time
    duration_minutes: int
    capacity: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    class_date: date


class BookingResponse(BaseModel):
    id: UUID
    class_id: UUID
    trainee_id: UUID
    class_date: date
    status: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class ClassWithAvailability(GymClassResponse):
    booked: int
    spots_left: int
