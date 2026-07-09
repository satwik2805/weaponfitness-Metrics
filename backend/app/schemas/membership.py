# app/schemas/membership.py

from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional
from decimal import Decimal


class MembershipBase(BaseModel):
    branch_id: UUID
    plan_name: str
    price: Decimal
    duration_months: int
    description: Optional[str] = None


class MembershipCreate(MembershipBase):
    """Create membership plan"""
    pass


class MembershipUpdate(BaseModel):
    """Update membership plan"""
    plan_name: Optional[str] = None
    price: Optional[Decimal] = None
    duration_months: Optional[int] = None
    description: Optional[str] = None
    branch_id: Optional[UUID] = None


class MembershipResponse(MembershipBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)
