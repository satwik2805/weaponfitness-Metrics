"""Trainees API. Rules: staff create/list members; a member reads and updates
THEIR OWN record (weight/height — never xp/level, which are server-owned);
deletes are Owner/Admin. Stats/workouts are self-or-staff."""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
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
from app.db.models.trainee import Trainee
from app.schemas.trainee import (
    TraineeCreate,
    TraineeUpdate,
    TraineeResponse
)

router = APIRouter()

# CREATE (staff — or the member completing their own onboarding)
@router.post("/", response_model=TraineeResponse, status_code=status.HTTP_201_CREATED)
def create_trainee(
    trainee: TraineeCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    assert_self_or_roles(user, trainee.id, *STAFF_ROLES)

    existing = db.query(Trainee).filter(Trainee.id == trainee.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Trainee already exists")

    db_trainee = Trainee(**trainee.model_dump(exclude_unset=True))
    db.add(db_trainee)
    db.commit()
    db.refresh(db_trainee)
    return db_trainee

# READ BY ID (self or staff)
@router.get("/{trainee_id}", response_model=TraineeResponse)
def get_trainee(
    trainee_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")
    return trainee

# READ ALL (staff)
@router.get("/", response_model=list[TraineeResponse])
def list_trainees(
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*STAFF_ROLES)),
):
    return db.query(Trainee).all()

# UPDATE (self or staff — XP/level are server-owned, never client-settable)
@router.put("/{trainee_id}", response_model=TraineeResponse)
def update_trainee(
    trainee_id: UUID,
    trainee_data: TraineeUpdate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)

    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    updates = trainee_data.model_dump(exclude_unset=True)
    # Farmable-XP guard (audit WF-040): gamification fields only move through
    # server-side logic, never through this endpoint.
    for guarded in ("xp", "level"):
        updates.pop(guarded, None)

    for key, value in updates.items():
        setattr(trainee, key, value)

    db.commit()
    db.refresh(trainee)
    return trainee

# DELETE (Owner/Admin)
@router.delete("/{trainee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trainee(
    trainee_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*ADMIN_ROLES)),
):
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    db.delete(trainee)
    db.commit()

# --- GAMIFICATION ---
from app.services.gamification_service import get_trainee_gamification_stats

@router.get("/stats/{trainee_id}")
def get_gamification_stats(
    trainee_id: UUID,
    db: Session = Depends(get_db),
    today_date: date = Query(None),
    user: AuthUser = Depends(get_current_user),
):
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    stats = get_trainee_gamification_stats(db, trainee_id, today_date=today_date)
    if not stats:
        raise HTTPException(status_code=404, detail="Stats not found")
    return stats
# --- WORKOUTS ---
from app.services.workout_service import get_workouts_for_date
from app.db.models.workout import WorkoutTemplate

@router.get("/{trainee_id}/workouts")
def get_trainee_workouts(
    trainee_id: UUID,
    db: Session = Depends(get_db),
    today_date: date = Query(None),
    user: AuthUser = Depends(get_current_user),
):
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    if today_date is None:
        today_date = date.today()

    workout_ids = get_workouts_for_date(db, trainee_id, today_date)

    # Fetch full templates
    workouts = db.query(WorkoutTemplate).filter(WorkoutTemplate.id.in_(workout_ids)).all()
    return {"data": workouts}
