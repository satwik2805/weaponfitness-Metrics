# app/api/trainer.py
"""Trainers API. Rules: members may browse the trainer directory (read);
creating/removing trainers is Owner/Admin; a trainer may edit their own
record (bio, experience), admins may edit anyone's."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.auth import (
    ADMIN_ROLES,
    AuthUser,
    assert_self_or_roles,
    get_current_user,
    require_roles,
)
from app.core.database import get_db
from app.db.models.trainer import Trainer
from app.schemas.trainer import (
    TrainerCreate,
    TrainerUpdate,
    TrainerResponse
)

router = APIRouter()


# CREATE (Owner/Admin)
@router.post("/", response_model=TrainerResponse)
def create_trainer(
    trainer: TrainerCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*ADMIN_ROLES)),
):
    existing = db.query(Trainer).filter(Trainer.id == trainer.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Trainer already exists")

    db_trainer = Trainer(**trainer.model_dump())
    db.add(db_trainer)
    db.commit()
    db.refresh(db_trainer)
    return db_trainer


# READ (any signed-in user — members browse their coaches)
@router.get("/{trainer_id}", response_model=TrainerResponse)
def get_trainer(
    trainer_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    return trainer


# READ ALL (any signed-in user)
@router.get("/", response_model=list[TrainerResponse])
def list_trainers(
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    return db.query(Trainer).all()


# UPDATE (the trainer themself, or Owner/Admin)
@router.put("/{trainer_id}", response_model=TrainerResponse)
def update_trainer(
    trainer_id: UUID,
    trainer_data: TrainerUpdate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    assert_self_or_roles(user, trainer_id, *ADMIN_ROLES)

    trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    for key, value in trainer_data.model_dump(exclude_unset=True).items():
        setattr(trainer, key, value)

    db.commit()
    db.refresh(trainer)
    return trainer


# DELETE (Owner/Admin)
@router.delete("/{trainer_id}")
def delete_trainer(
    trainer_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*ADMIN_ROLES)),
):
    trainer = db.query(Trainer).filter(Trainer.id == trainer_id).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    db.delete(trainer)
    db.commit()
    return {"message": "Trainer deleted successfully"}
