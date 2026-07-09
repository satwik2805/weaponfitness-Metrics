from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional


class BranchBase(BaseModel):
    branch_name: str
    address: Optional[str] = None
    contact_number: Optional[str] = None
    owner_id: UUID
    allow_trainer_renewal: Optional[bool] = None


class BranchCreate(BranchBase):
    """Request body for creating a branch"""
    pass


class BranchUpdate(BaseModel):
    """Request body for updating a branch (partial allowed)"""
    branch_name: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None
    allow_trainer_renewal: Optional[bool] = None


class BranchResponse(BranchBase):
    id: UUID
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
