# app/schemas/trainer.py

from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional
from decimal import Decimal


class TrainerBase(BaseModel):
    experience_years: Optional[int] = None
    rating_avg: Optional[Decimal] = None
    bio: Optional[str] = None


class TrainerCreate(TrainerBase):
    """
    profile_id becomes trainer.id
    """
    id: UUID


class TrainerUpdate(BaseModel):
    experience_years: Optional[int] = None
    rating_avg: Optional[Decimal] = None
    bio: Optional[str] = None


class TrainerResponse(TrainerBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)
