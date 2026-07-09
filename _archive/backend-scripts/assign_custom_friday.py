
import sys
import traceback
from app.core.database import SessionLocal
from app.db.models.trainee import Trainee
from app.db.models.workout import CustomTraineeWeeklyWorkout, WorkoutTemplate

try:
    db = SessionLocal()

    # 1. Get ALL Trainees
    trainees = db.query(Trainee).all()
    if not trainees:
        print(" No trainees found")
        sys.exit(1)
    
    print(f" Found {len(trainees)} trainees. Assigning workout to ALL.")

    # 2. Get Template
    template = db.query(WorkoutTemplate).first()
    if not template:
        print(" No workout templates found")
        sys.exit(1)

    for trainee in trainees:
        try:
            # 3. Check/Delete Existing Custom Workout for Friday
            existing = db.query(CustomTraineeWeeklyWorkout).filter(
                CustomTraineeWeeklyWorkout.trainee_id == trainee.id,
                CustomTraineeWeeklyWorkout.day_name.in_(["Friday", "friday"])
            ).all()

            if existing:
                # print(f" Found existing for {trainee.id}. Deleting.")
                for ex in existing:
                    db.delete(ex)
            
            # 4. Create
            new_workout = CustomTraineeWeeklyWorkout(
                trainee_id=trainee.id,
                day_name="Friday",
                workout_template_id=template.id
            )
            db.add(new_workout)
            print(f" Assigned to {trainee.id}")
        except Exception as inner_e:
            print(f" Failed for {trainee.id}: {inner_e}")
            db.rollback()

    db.commit()
    print(" Finished assigning to all trainees")

except Exception as e:
    print(" Error occurred:")
    traceback.print_exc()
finally:
    db.close()
