import logging
from datetime import date
from sqlalchemy.orm import Session
from app.db.models.attendance import Attendance
from app.db.models.trainee import Trainee
from app.db.models.workout import (
    GroupWeeklyWorkout,
    CustomTraineeWeeklyWorkout,
    TraineeGroupMember
)
from app.db.models.profile import Profile
from app.db.enums import UserRoleEnum

logger = logging.getLogger("weaponfitness.attendance")

DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]

def next_day(day: str) -> str:
    return DAYS[(DAYS.index(day) + 1) % 7]


def handle_absence(db: Session, trainee_id):
    today = date.today()
    today_name = today.strftime("%A").lower()
    tomorrow_name = next_day(today_name)

    logger.info(
        "handle_absence called for trainee %s: today=%s (%s), tomorrow=%s",
        trainee_id, today, today_name, tomorrow_name,
    )

    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        #  AUTO-FIX: Check if Profile exists and create Trainee record
        logger.warning("Trainee record missing for %s, checking Profile...", trainee_id)
        profile = db.query(Profile).filter(Profile.id == trainee_id).first()

        if profile:
            logger.info("Profile found for %s, auto-creating Trainee record", profile.id)
            # Auto-create trainee record
            new_trainee = Trainee(
                id=profile.id,
                bmi=0, weight=0, height=0
            )
            db.add(new_trainee)
            db.commit() # Commit to ensure FK constraint is satisfied for Attendance
            db.refresh(new_trainee)
            trainee = new_trainee
            logger.info("Created missing Trainee record for %s", profile.id)
        else:
            logger.warning("Profile not found for %s either", trainee_id)
            raise ValueError("Trainee not found")

    # Create attendance record if not exists
    existing_attendance = db.query(Attendance).filter(
        Attendance.trainee_id == trainee_id,
        Attendance.attendance_date == today
    ).first()

    if not existing_attendance:
        db.add(Attendance(
            trainee_id=trainee_id,
            attendance_date=today,
            is_present=False
        ))
        logger.info("Attendance record created for trainee %s on %s", trainee_id, today)
    else:
        logger.info("Attendance record already exists for trainee %s on %s", trainee_id, today)

    # Shift workouts to tomorrow
    from app.services.workout_service import shift_workout_to_tomorrow
    logger.info("Calling shift_workout_to_tomorrow for trainee %s", trainee_id)
    shift_workout_to_tomorrow(db=db, trainee_id=trainee_id)
