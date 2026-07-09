
import sys
import traceback
from app.core.database import SessionLocal
from app.db.models.workout import GroupWeeklyWorkout, WorkoutTemplate, TraineeGroup

try:
    db = SessionLocal()

    # 1. Get Group
    group = db.query(TraineeGroup).filter(TraineeGroup.group_name == "Morning Batch").first()
    if not group:
        print(" Group 'Morning Batch' not found")
        sys.exit(1)

    # 2. Get Template
    template = db.query(WorkoutTemplate).first()
    if not template:
        print(" No workout templates found")
        sys.exit(1)

    print(f" Assigning '{template.name}' to '{group.group_name}' for Friday")

    # 3. Check if already exists (Friday OR friday)
    existing = db.query(GroupWeeklyWorkout).filter(
        GroupWeeklyWorkout.group_id == group.id,
        GroupWeeklyWorkout.day_name.in_(["Friday", "friday"])
    ).all()

    if existing:
        print(f" Found {len(existing)} existing Friday workouts. Deleting them to avoid conflicts.")
        for ex in existing:
            db.delete(ex)
        db.commit()

    # 4. Create
    new_workout = GroupWeeklyWorkout(
        group_id=group.id,
        day_name="Friday",
        workout_template_id=template.id
    )
    db.add(new_workout)
    db.commit()
    print(" Created new Friday workout successfully")

except Exception as e:
    print(" Error occurred:")
    traceback.print_exc()
finally:
    db.close()
