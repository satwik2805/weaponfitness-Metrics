from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

from app.db.enums import UserRoleEnum


class ProfileBase(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    role: UserRoleEnum
    branch_id: Optional[UUID] = None


class ProfileCreate(ProfileBase):
    """
    ID comes from Supabase auth.users
    """
    id: UUID


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    role: Optional[UserRoleEnum] = None
    branch_id: Optional[UUID] = None


class ProfileResponse(ProfileBase):
    id: UUID
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    profile_updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
