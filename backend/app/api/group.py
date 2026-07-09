"""Trainee groups API.

Authorization (on top of router-wide JWT auth in main.py):
- Create/delete (and membership changes, which happen at creation): a Trainer
  may only act on groups where group.trainer_id == their own id; Owner/Admin
  are unrestricted; everyone else is denied.
- Reads: staff see everything; a non-staff caller only sees groups they are
  a member of.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel

from app.core.auth import ADMIN_ROLES, STAFF_ROLES, AuthUser, get_current_user
from app.core.database import get_db
from app.db.models.workout import TraineeGroup, TraineeGroupMember
from app.db.models.trainer import Trainer

router = APIRouter(tags=["Groups"])


def _assert_can_manage_group(user: AuthUser, trainer_id) -> None:
    """Owner/Admin manage any group; a Trainer only their own."""
    if user.role in ADMIN_ROLES:
        return
    if user.role == "Trainer" and str(user.id) == str(trainer_id):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You can only manage your own groups.",
    )

class GroupCreate(BaseModel):
    groupName: str
    trainerId: UUID
    memberIds: List[UUID]

@router.post("/")
def create_group(
    data: GroupCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    # A Trainer may only create groups owned by themselves; Owner/Admin any.
    _assert_can_manage_group(user, data.trainerId)

    # 1. Verify Trainer
    trainer = db.query(Trainer).filter(Trainer.id == data.trainerId).first()
    if not trainer:
        # Auto-create trainer if missing (authority fix)
        new_trainer = Trainer(id=data.trainerId, experience_years=1, bio="Certified Trainer")
        db.add(new_trainer)
        db.commit()
    
    # 2. Create Group
    db_group = TraineeGroup(group_name=data.groupName, trainer_id=data.trainerId)
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    # 3. Add Members
    for member_id in data.memberIds:
        member = TraineeGroupMember(group_id=db_group.id, trainee_id=member_id)
        db.add(member)
    
    db.commit()
    
    return {"success": True, "message": "Group created successfully", "groupId": db_group.id}

@router.get("/{trainer_id}")
def list_groups(
    trainer_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    groups = db.query(TraineeGroup).filter(TraineeGroup.trainer_id == trainer_id).all()

    # Staff see everything; everyone else only the groups they belong to.
    if user.role in STAFF_ROLES:
        return groups

    member_group_ids = {
        row.group_id
        for row in db.query(TraineeGroupMember.group_id)
        .filter(TraineeGroupMember.trainee_id == user.id)
        .all()
    }
    return [g for g in groups if g.id in member_group_ids]

@router.delete("/{group_id}")
def delete_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    group = db.query(TraineeGroup).filter(TraineeGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # A Trainer may only delete their own groups; Owner/Admin any.
    _assert_can_manage_group(user, group.trainer_id)

    db.delete(group)
    db.commit()
    return {"success": True, "message": "Group deleted"}
