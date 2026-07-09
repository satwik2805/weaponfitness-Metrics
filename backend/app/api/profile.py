"""Profiles API.

Authorization model (the exemplar for every router):
- Authentication is enforced router-wide in main.py (verified Supabase JWT).
- A user may always read/update THEIR OWN profile.
- Staff visibility: Owner/Admin see everything; Receptionist/Trainer can read
  (front-desk and coaching both need member lookups).
- Creating a profile is only allowed for yourself (first login) or by staff.
- Deleting is Owner/Admin only.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.auth import (
    ADMIN_ROLES,
    STAFF_ROLES,
    AuthUser,
    assert_self_or_roles,
    get_current_user,
    require_roles,
)
from app.core.database import get_db
from app.db.models.profile import Profile
from app.schemas.profile import (
    ProfileCreate,
    ProfileUpdate,
    ProfileResponse
)

router = APIRouter()


# --------------------------------------------------
# CREATE PROFILE
# --------------------------------------------------
@router.post("/", response_model=ProfileResponse)
def create_profile(
    profile: ProfileCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    # Self-registration on first login, or staff creating members.
    assert_self_or_roles(user, profile.id, *STAFF_ROLES)

    existing = db.query(Profile).filter(Profile.id == profile.id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Profile already exists"
        )

    db_profile = Profile(**profile.model_dump())
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


# --------------------------------------------------
# GET PROFILE BY ID
# --------------------------------------------------
@router.get("/{profile_id}", response_model=ProfileResponse)
def get_profile(
    profile_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    assert_self_or_roles(user, profile_id, *STAFF_ROLES)

    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )
    return profile


# --------------------------------------------------
# LIST PROFILES (staff only)
# --------------------------------------------------
@router.get("/", response_model=list[ProfileResponse])
def list_profiles(
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*STAFF_ROLES)),
):
    return db.query(Profile).all()


# --------------------------------------------------
# UPDATE PROFILE
# --------------------------------------------------
@router.put("/{profile_id}", response_model=ProfileResponse)
def update_profile(
    profile_id: UUID,
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    assert_self_or_roles(user, profile_id, *ADMIN_ROLES)

    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )

    updates = profile_data.model_dump(exclude_unset=True)

    # Privilege-escalation guard: only Owner/Admin may change roles, and
    # only an Owner can grant Owner.
    if "role" in updates and updates["role"] is not None:
        new_role = updates["role"].value if hasattr(updates["role"], "value") else updates["role"]
        current = profile.role.value if hasattr(profile.role, "value") else profile.role
        if new_role != current:
            if user.role not in ADMIN_ROLES:
                raise HTTPException(status_code=403, detail="Only owners and admins can change roles.")
            if new_role == "Owner" and user.role != "Owner":
                raise HTTPException(status_code=403, detail="Only an owner can grant the Owner role.")

    for key, value in updates.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


# --------------------------------------------------
# DELETE PROFILE (Owner/Admin only)
# --------------------------------------------------
@router.delete("/{profile_id}")
def delete_profile(
    profile_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*ADMIN_ROLES)),
):
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )

    db.delete(profile)
    db.commit()
    return {"message": "Profile deleted successfully"}
