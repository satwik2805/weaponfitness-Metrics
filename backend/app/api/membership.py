# app/api/membership.py
"""Membership plans. Reads are open to any signed-in user (members see plan
pricing); creating/editing/removing plans is Owner/Admin."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.auth import ADMIN_ROLES, AuthUser, get_current_user, require_roles
from app.core.database import get_db
from app.db.models.membership import MembershipPlan
from app.schemas.membership import (
    MembershipCreate,
    MembershipUpdate,
    MembershipResponse
)

router = APIRouter()


# CREATE (Owner/Admin)
@router.post("/", response_model=MembershipResponse)
def create_membership(
    membership: MembershipCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*ADMIN_ROLES)),
):
    db_membership = MembershipPlan(**membership.model_dump())
    db.add(db_membership)
    db.commit()
    db.refresh(db_membership)
    return db_membership


# READ (any signed-in user)
@router.get("/{membership_id}", response_model=MembershipResponse)
def get_membership(
    membership_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    membership = (
        db.query(MembershipPlan)
        .filter(MembershipPlan.id == membership_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Membership plan not found")
    return membership


# READ ALL (any signed-in user)
@router.get("/", response_model=list[MembershipResponse])
def list_memberships(
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    return db.query(MembershipPlan).all()


# UPDATE (Owner/Admin)
@router.put("/{membership_id}", response_model=MembershipResponse)
def update_membership(
    membership_id: UUID,
    membership_data: MembershipUpdate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*ADMIN_ROLES)),
):
    membership = (
        db.query(MembershipPlan)
        .filter(MembershipPlan.id == membership_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Membership plan not found")

    for key, value in membership_data.model_dump(exclude_unset=True).items():
        setattr(membership, key, value)

    db.commit()
    db.refresh(membership)
    return membership


# DELETE (Owner/Admin)
@router.delete("/{membership_id}")
def delete_membership(
    membership_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*ADMIN_ROLES)),
):
    membership = (
        db.query(MembershipPlan)
        .filter(MembershipPlan.id == membership_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Membership plan not found")

    db.delete(membership)
    db.commit()
    return {"message": "Membership plan deleted successfully"}
