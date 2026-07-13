"""Staff registration endpoint.

Creates a Supabase Auth user + profile + role-specific record (trainer row)
in one atomic-ish flow.  Only Owners and Admins may call this.

Uses the Supabase Admin API (service-role key) via httpx — the anon key
cannot create users on behalf of someone else.
"""

import logging
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.auth import ADMIN_ROLES, AuthUser, require_roles
from app.core.config import settings
from app.core.database import get_db
from app.db.enums import UserRoleEnum
from app.db.models.profile import Profile
from app.db.models.trainer import Trainer
from app.db.models.trainee import Trainee

logger = logging.getLogger("weaponfitness.register")

router = APIRouter()


class RegisterStaffRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None
    role: str  # "Trainer", "Receptionist", "Trainee"
    branch_id: UUID | None = None
    # trainer-specific
    experience_years: int | None = None
    bio: str | None = None
    # trainee-specific
    trainer_id: UUID | None = None


class RegisterStaffResponse(BaseModel):
    user_id: str
    message: str


@router.post("/", response_model=RegisterStaffResponse)
async def register_staff(
    body: RegisterStaffRequest,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*ADMIN_ROLES)),
):
    """Create a new auth user + profile + role-specific record."""

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=503,
            detail="Server is not configured for user registration (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
        )

    # Validate role
    try:
        role_enum = UserRoleEnum(body.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {body.role}")

    # 1. Create Supabase Auth user via Admin API
    admin_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/admin/users"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            admin_url,
            json={
                "email": body.email,
                "password": body.password,
                "email_confirm": True,
            },
            headers=headers,
        )

    if resp.status_code >= 400:
        detail = resp.text
        try:
            detail = resp.json().get("msg", resp.text)
        except Exception:
            pass
        logger.error("Supabase admin user create failed: %s", detail)
        raise HTTPException(status_code=resp.status_code, detail=detail)

    auth_user = resp.json()
    new_user_id = auth_user["id"]

    # 2. Create profile + role-specific rows
    try:
        profile = Profile(
            id=new_user_id,
            full_name=body.full_name,
            phone=body.phone,
            role=role_enum,
            branch_id=str(body.branch_id) if body.branch_id else None,
        )
        db.add(profile)
        db.flush()

        # Trainer row
        if role_enum == UserRoleEnum.Trainer:
            trainer = Trainer(
                id=new_user_id,
                experience_years=body.experience_years,
                bio=body.bio,
            )
            db.add(trainer)
            db.flush()

        # Trainee row (linked to trainer if provided)
        if role_enum == UserRoleEnum.Trainee:
            trainee = Trainee(
                id=new_user_id,
                trainer_id=str(body.trainer_id) if body.trainer_id else None,
            )
            db.add(trainee)
            db.flush()

        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception("Failed to create profile/role records for %s", new_user_id)
        raise HTTPException(
            status_code=500,
            detail=f"Auth user was created but profile setup failed: {e}",
        )

    return RegisterStaffResponse(
        user_id=new_user_id,
        message=f"{body.role} account created successfully.",
    )
