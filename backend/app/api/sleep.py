import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, time as dt_time

from app.core.auth import (
    ADMIN_ROLES,
    STAFF_ROLES,
    AuthUser,
    assert_self_or_roles,
    get_current_user,
)
from app.core.database import get_db
from app.db.models.sleep import SleepLog
from app.schemas.sleep import SleepCreate, SleepUpdate, SleepResponse
from app.services.gamification_service import award_xp, XP_PER_SLEEP_LOG

logger = logging.getLogger("weaponfitness.sleep")

router = APIRouter(prefix="/sleep", tags=["Sleep"])


# ----------------- UTILS -----------------
def calc_minutes(start: datetime, end: datetime):
    if not start or not end:
        return 0
    return int((end - start).total_seconds() // 60)


def minutes_to_hours(mins: int | None):
    if mins is None:
        return None
    return round(mins / 60, 2)


def compute_sleep_score(minutes, wakeups, depth):
    score = 0
    if not minutes:
        return 0

    if minutes >= 420:
        score += 40
    elif minutes >= 360:
        score += 30
    else:
        score += 15

    score -= (wakeups or 0) * 5
    score += (depth or 0) * 6

    return max(0, min(100, score))


def calc_score(hours: float | None):
    # Simple score based on hours if detailed stats not available
    if not hours: return 0
    if hours >= 8: return 100
    if hours >= 7: return 90
    if hours >= 6: return 75
    return 50


def safe_datetime(val):
    return val if isinstance(val, datetime) else None


def serialize_log(log: SleepLog):
    data = dict(log.__dict__)
    data.pop("_sa_instance_state", None)
    return data


# ----------------- CREATE -----------------
@router.post("/", response_model=SleepResponse)
def create_sleep_log(
    data: SleepCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    # Trainees log their own sleep; staff may log on a trainee's behalf.
    assert_self_or_roles(user, data.trainee_id, *STAFF_ROLES)
    try:
        log_data = data.model_dump()
        
        # Remove timezone info from time objects (database Time column doesn't support timezone)
        if log_data.get("sleep_start") and hasattr(log_data["sleep_start"], 'tzinfo') and log_data["sleep_start"].tzinfo is not None:
            ts = log_data["sleep_start"]
            log_data["sleep_start"] = dt_time(ts.hour, ts.minute, ts.second, ts.microsecond)

        if log_data.get("sleep_end") and hasattr(log_data["sleep_end"], 'tzinfo') and log_data["sleep_end"].tzinfo is not None:
            ts = log_data["sleep_end"]
            log_data["sleep_end"] = dt_time(ts.hour, ts.minute, ts.second, ts.microsecond)
        
        # Convert 0 to None for deep_sleep_rating (database constraint requires 1-10 or NULL)
        if log_data.get("deep_sleep_rating") == 0 or (log_data.get("deep_sleep_rating") is not None and (log_data["deep_sleep_rating"] < 1 or log_data["deep_sleep_rating"] > 10)):
            log_data["deep_sleep_rating"] = None
        
        log = SleepLog(**log_data)

        #  AUTO SCORE & MINUTES
        if not log.score:
            log.score = calc_score(log.total_hours)
        if log.total_hours and not log.total_sleep_minutes:
            log.total_sleep_minutes = int(log.total_hours * 60)

        db.add(log)
        db.commit()
        db.refresh(log)

        # Award XP for sleep log
        try:
            award_xp(db, log.trainee_id, XP_PER_SLEEP_LOG)
        except Exception:
            logger.exception("Failed to award XP for sleep log for trainee %s", log.trainee_id)

        #  Update daily consistency (Trifecta tracking)
        try:
            from app.services.consistency_service import update_daily_consistency
            update_daily_consistency(db, log.trainee_id, log.sleep_date)
            logger.info("Consistency updated for trainee %s", log.trainee_id)
        except Exception:
            logger.exception("Failed to update consistency for trainee %s", log.trainee_id)

        return log
    except Exception as e:
        db.rollback()
        logger.exception("Error creating sleep log for trainee %s", data.trainee_id)
        raise HTTPException(status_code=400, detail="Couldn't save your sleep log. Please try again.")


# ----------------- UPDATE -----------------
@router.put("/{sleep_id}", response_model=SleepResponse)
def update_sleep_log(
    sleep_id: UUID,
    data: SleepUpdate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    try:
        log = db.query(SleepLog).filter(SleepLog.id == sleep_id).first()
        if not log:
            raise HTTPException(status_code=404, detail="Sleep log not found")

        # Write: the trainee who owns the log, or staff.
        assert_self_or_roles(user, log.trainee_id, *STAFF_ROLES)

        # Get which fields were set
        fields_set = data.model_dump(exclude_unset=True).keys()
        
        # Update fields directly from model (preserves types like time objects)
        if "sleep_date" in fields_set:
            log.sleep_date = data.sleep_date
        if "sleep_start" in fields_set:
            start_time = data.sleep_start
            if start_time and hasattr(start_time, 'tzinfo') and start_time.tzinfo is not None:
                start_time = dt_time(start_time.hour, start_time.minute, start_time.second, start_time.microsecond)
            log.sleep_start = start_time
        if "sleep_end" in fields_set:
            end_time = data.sleep_end
            if end_time and hasattr(end_time, 'tzinfo') and end_time.tzinfo is not None:
                end_time = dt_time(end_time.hour, end_time.minute, end_time.second, end_time.microsecond)
            log.sleep_end = end_time
        if "total_hours" in fields_set:
            log.total_hours = data.total_hours
        if "woke_up_count" in fields_set:
            log.woke_up_count = data.woke_up_count
        if "deep_sleep_rating" in fields_set:
            rating = data.deep_sleep_rating
            if rating == 0 or (rating is not None and (rating < 1 or rating > 10)):
                log.deep_sleep_rating = None
            else:
                log.deep_sleep_rating = rating
        if "sleep_quality_notes" in fields_set:
            log.sleep_quality_notes = data.sleep_quality_notes

        # Recalculate score and minutes if total_hours was updated
        if "total_hours" in fields_set:
            log.score = calc_score(log.total_hours)
            if log.total_hours:
                log.total_sleep_minutes = int(log.total_hours * 60)

        db.commit()
        db.refresh(log)

        #  Update daily consistency (Trifecta tracking)
        try:
            from app.services.consistency_service import update_daily_consistency
            update_daily_consistency(db, log.trainee_id, log.sleep_date)
            logger.info("Consistency updated for trainee %s (update)", log.trainee_id)
        except Exception:
            logger.exception("Failed to update consistency for trainee %s", log.trainee_id)

        return log
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("Error updating sleep log %s", sleep_id)
        raise HTTPException(status_code=500, detail="Couldn't update your sleep log. Please try again.")


# ----------------- GET BY ID -----------------
@router.get("/{sleep_id}", response_model=SleepResponse)
def get_sleep(
    sleep_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    log = db.query(SleepLog).filter(SleepLog.id == sleep_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Sleep log not found")

    # Read: owner or staff.
    assert_self_or_roles(user, log.trainee_id, *STAFF_ROLES)
    return log


# ----------------- GET BY TRAINEE -----------------
@router.get("/trainee/{trainee_id}", response_model=list[SleepResponse])
def get_trainee_sleep(
    trainee_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    # Read: the trainee themselves or staff.
    assert_self_or_roles(user, trainee_id, *STAFF_ROLES)

    logs = (
        db.query(SleepLog)
        .filter(SleepLog.trainee_id == trainee_id)
        .order_by(SleepLog.sleep_date.desc())
        .all()
    )
    return logs


# ----------------- DELETE -----------------
@router.delete("/{sleep_id}")
def delete_sleep(
    sleep_id: UUID,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    log = db.query(SleepLog).filter(SleepLog.id == sleep_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Sleep log not found")

    # Delete: owner or Owner/Admin only.
    assert_self_or_roles(user, log.trainee_id, *ADMIN_ROLES)

    db.delete(log)
    db.commit()
    return {"message": "Sleep log deleted"}
