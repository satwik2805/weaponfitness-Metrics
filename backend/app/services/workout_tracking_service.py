# app/services/workout_tracking_service.py
import logging
from sqlalchemy.orm import Session
from datetime import date, datetime
from uuid import UUID

from app.db.models.workout_log import WorkoutLog
from app.db.models.attendance import Attendance
from app.db.models.workout_schedule import WorkoutSchedule
from app.services.gamification_service import award_xp, XP_PER_WORKOUT

logger = logging.getLogger("weaponfitness.workout_tracking")


def auto_create_workout_log_from_attendance(
    db: Session, 
    attendance_id: UUID, 
    trainee_id: UUID, 
    attendance_date: date
) -> WorkoutLog:
    """
    Automatically creates a workout log when a trainee marks attendance.
    Links to the scheduled workout for that day if available.
    """
    
    # Check if workout log already exists for this attendance
    existing_log = db.query(WorkoutLog).filter(
        WorkoutLog.attendance_id == attendance_id
    ).first()
    
    if existing_log:
        logger.info("Workout log already exists for attendance %s", attendance_id)
        return existing_log
    
    # Find scheduled workout for this trainee on this date
    scheduled_workout = db.query(WorkoutSchedule).filter(
        WorkoutSchedule.trainee_id == trainee_id,
        WorkoutSchedule.scheduled_date == attendance_date
    ).first()
    
    workout_template_id = scheduled_workout.workout_template_id if scheduled_workout else None
    
    # Create workout log
    workout_log = WorkoutLog(
        trainee_id=trainee_id,
        attendance_id=attendance_id,
        workout_date=attendance_date,
        workout_template_id=workout_template_id,
        is_completed=True,
        auto_tracked=True
    )
    
    db.add(workout_log)
    db.commit()
    db.refresh(workout_log)
    
    # Award XP for workout
    try:
        award_xp(db, trainee_id, XP_PER_WORKOUT)
    except Exception:
        logger.exception("Failed to award XP for trainee %s", trainee_id)

    logger.info("Auto-created workout log for trainee %s on %s", trainee_id, attendance_date)
    return workout_log


def get_trainee_workout_logs(db: Session, trainee_id: UUID, limit: int = 30):
    """
    Get workout logs for a trainee, most recent first.
    """
    return db.query(WorkoutLog).filter(
        WorkoutLog.trainee_id == trainee_id
    ).order_by(WorkoutLog.workout_date.desc()).limit(limit).all()


def get_workout_stats(db: Session, trainee_id: UUID, days: int = 30):
    """
    Get workout statistics for a trainee over the last N days.
    """
    from datetime import timedelta
    
    start_date = date.today() - timedelta(days=days)
    
    logs = db.query(WorkoutLog).filter(
        WorkoutLog.trainee_id == trainee_id,
        WorkoutLog.workout_date >= start_date,
        WorkoutLog.is_completed == True
    ).all()
    
    total_workouts = len(logs)
    total_duration = sum(log.duration_minutes or 0 for log in logs)
    
    return {
        "total_workouts": total_workouts,
        "total_duration_minutes": total_duration,
        "average_duration_minutes": total_duration / total_workouts if total_workouts > 0 else 0,
        "period_days": days,
        "workouts_per_week": (total_workouts / days) * 7 if days > 0 else 0
    }
