# app/api/workout_log.py
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.core.auth import (
    ADMIN_ROLES,
    STAFF_ROLES,
    AuthUser,
    assert_self_or_roles,
    get_current_user,
    require_roles,
)
from app.core.database import get_db
from app.db.models.workout_log import WorkoutLog
from app.schemas.workout_log import WorkoutLogCreate, WorkoutLogUpdate, WorkoutLogResponse
from app.services.workout_tracking_service import (
    get_trainee_workout_logs,
    get_workout_stats
)
from app.services.gamification_service import award_xp, XP_PER_WORKOUT

logger = logging.getLogger("weaponfitness.workout_log")

router = APIRouter(tags=["Workout Logs"])

# GET ALL WORKOUT LOGS (staff only)
@router.get("/", response_model=List[WorkoutLogResponse])
def get_all_workout_logs(
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_roles(*STAFF_ROLES)),
):
    """Get all workout logs"""
    return db.query(WorkoutLog).all()

# GET WORKOUT LOGS FOR A TRAINEE (self or staff)
@router.get("/trainee/{trainee_id}", response_model=List[WorkoutLogResponse])
def get_trainee_logs(
    trainee_id: UUID,
    limit: int = 30,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Get workout logs for a specific trainee"""
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    logs = get_trainee_workout_logs(db, trainee_id, limit)
    return logs

# GET WORKOUT STATS FOR A TRAINEE (self or staff)
@router.get("/trainee/{trainee_id}/stats")
def get_trainee_stats(
    trainee_id: UUID,
    days: int = 30,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Get workout statistics for a trainee"""
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)
    stats = get_workout_stats(db, trainee_id, days)
    return stats

# CREATE WORKOUT LOG (self or staff — XP is awarded server-side, so the
# logged trainee must be the caller unless staff is logging on their behalf)
@router.post("/", response_model=WorkoutLogResponse)
def create_workout_log(
    log: WorkoutLogCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Manually create a workout log"""
    assert_self_or_roles(user, log.trainee_id, *STAFF_ROLES)
    db_log = WorkoutLog(**log.model_dump())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    #  Award XP for manual workout log
    if db_log.is_completed:
        try:
            award_xp(db, db_log.trainee_id, XP_PER_WORKOUT)
        except Exception:
            logger.exception("Failed to award XP for manual workout for trainee %s", db_log.trainee_id)

    # Update daily consistency (Trifecta tracking)
    try:
        from app.services.consistency_service import update_daily_consistency
        update_daily_consistency(db, db_log.trainee_id, db_log.workout_date)
        logger.info("Consistency updated for trainee %s", db_log.trainee_id)
    except Exception:
        logger.exception("Failed to update consistency for trainee %s", db_log.trainee_id)

    return db_log

# GET SINGLE WORKOUT LOG (owner of the log, or staff)
@router.get("/{log_id}", response_model=WorkoutLogResponse)
def get_workout_log(
    log_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Get a specific workout log"""
    log = db.query(WorkoutLog).filter(WorkoutLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Workout log not found")
    assert_self_or_roles(user, log.trainee_id, *STAFF_ROLES)
    return log

# UPDATE WORKOUT LOG (owner of the log, or staff)
@router.put("/{log_id}", response_model=WorkoutLogResponse)
def update_workout_log(
    log_id: UUID,
    data: WorkoutLogUpdate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Update a workout log (e.g., add notes, duration)"""
    log = db.query(WorkoutLog).filter(WorkoutLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Workout log not found")
    assert_self_or_roles(user, log.trainee_id, *STAFF_ROLES)

    # Update fields
    if data.is_completed is not None:
        log.is_completed = data.is_completed
    if data.duration_minutes is not None:
        log.duration_minutes = data.duration_minutes
    if data.notes is not None:
        log.notes = data.notes
    
    db.commit()
    db.refresh(log)
    
    # Update daily consistency if workout was marked complete
    if data.is_completed:
        try:
            from app.services.consistency_service import update_daily_consistency
            update_daily_consistency(db, log.trainee_id, log.workout_date)
            logger.info("Consistency updated for trainee %s", log.trainee_id)
        except Exception:
            logger.exception("Failed to update consistency for trainee %s", log.trainee_id)

    return log

# DELETE WORKOUT LOG (owner of the log, or admin)
@router.delete("/{log_id}")
def delete_workout_log(
    log_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    """Delete a workout log"""
    log = db.query(WorkoutLog).filter(WorkoutLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Workout log not found")
    assert_self_or_roles(user, log.trainee_id, *ADMIN_ROLES)

    db.delete(log)
    db.commit()
    return {"message": "Workout log deleted"}
