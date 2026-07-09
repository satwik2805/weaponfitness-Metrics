
from app.core.database import SessionLocal
from app.db.models.workout import GroupWeeklyWorkout, WorkoutTemplate, TraineeGroup
import uuid

db = SessionLocal()

# 1. Get Group
group = db.query(TraineeGroup).filter(TraineeGroup.group_name == "Morning Batch").first()
if not group:
    print(" Group 'Morning Batch' not found")
    exit()

# 2. Get Template
template = db.query(WorkoutTemplate).first()
if not template:
    print(" No workout templates found")
    exit()

print(f" Assigning '{template.name}' to '{group.group_name}' for Friday")

# 3. Check if already exists
existing = db.query(GroupWeeklyWorkout).filter(
    GroupWeeklyWorkout.group_id == group.id,
    GroupWeeklyWorkout.day_name == "Friday"
).first()

if existing:
    print(" Workout already exists for Friday. Updating template.")
    existing.workout_template_id = template.id
else:
    # 4. Create
    new_workout = GroupWeeklyWorkout(
        group_id=group.id,
        day_name="Friday",
        workout_template_id=template.id
    )
    db.add(new_workout)
    print(" Created new Friday workout")

db.commit()
print(" Done")
