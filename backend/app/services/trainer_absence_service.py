from datetime import date
from sqlalchemy.orm import Session

from app.db.models.trainer_attendance import TrainerAttendance
from app.db.models.workout import GroupWeeklyWorkout, TraineeGroup

DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]

def next_day(day: str) -> str:
    return DAYS[(DAYS.index(day) + 1) % 7]

def handle_trainer_absence(db: Session, trainer_id):
    today = date.today()
    today_name = today.strftime("%A").lower()
    tomorrow = next_day(today_name)

    # 1. mark trainer absent
    existing = db.query(TrainerAttendance).filter(
        TrainerAttendance.trainer_id == trainer_id,
        TrainerAttendance.attendance_date == today
    ).first()

    if not existing:
        db.add(TrainerAttendance(
            trainer_id=trainer_id,
            attendance_date=today,
            is_present=False
        ))

    # 2. shift all group workouts of this trainer
    groups = db.query(TraineeGroup).filter(
        TraineeGroup.trainer_id == trainer_id
    ).all()

    for g in groups:
        workouts = db.query(GroupWeeklyWorkout).filter(
            GroupWeeklyWorkout.group_id == g.id,
            GroupWeeklyWorkout.day_name == today_name
        ).all()

        for w in workouts:
            w.day_name = tomorrow

    db.commit()
