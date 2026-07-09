
from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import date, datetime, time

class SleepCreate(BaseModel):
    trainee_id: UUID
    sleep_date: date
    sleep_start: time | None = None
    sleep_end: time | None = None
    total_hours: float | None = None
    woke_up_count: int | None = 0
    deep_sleep_rating: int | None = None
    sleep_quality_notes: str | None = None
    
    @field_validator('deep_sleep_rating')
    @classmethod
    def validate_rating(cls, v):
        if v is not None:
            if v == 0 or v < 1 or v > 10:
                return None
        return v

class SleepUpdate(BaseModel):
    sleep_date: date | None = None
    sleep_start: time | None = None
    sleep_end: time | None = None
    total_hours: float | None = None
    woke_up_count: int | None = None
    deep_sleep_rating: int | None = None
    sleep_quality_notes: str | None = None
    
    @field_validator('deep_sleep_rating')
    @classmethod
    def validate_rating(cls, v):
        if v is not None:
            if v == 0 or v < 1 or v > 10:
                return None
        return v

class SleepResponse(BaseModel):
    id: UUID
    trainee_id: UUID
    sleep_date: date
    sleep_start: time | None
    sleep_end: time | None
    total_hours: float | None
    total_sleep_minutes: int | None
    woke_up_count: int | None
    deep_sleep_rating: int | None
    sleep_quality_notes: str | None
    score: int
    created_at: datetime

    class Config:
        from_attributes = True
