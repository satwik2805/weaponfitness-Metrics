
import sys
from app.core.database import SessionLocal
from app.db.models.workout import WorkoutTemplate

try:
    db = SessionLocal()

    # Find the 'Chest & Triceps' template
    template = db.query(WorkoutTemplate).filter(WorkoutTemplate.name == "Chest & Triceps").first()
    
    if not template:
        print(" Template 'Chest & Triceps' not found. Creating it...")
        # Optional: create if really missing, but it should be there based on screenshot
        template = WorkoutTemplate(name="Chest & Triceps")
        db.add(template)
    
    # Update instructions with a proper newline-separated list
    new_instructions = """Barbell Bench Press - 4 sets x 10 reps
Incline Dumbbell Press - 3 sets x 12 reps
Cable Crossover - 3 sets x 15 reps
Tricep Dips - 3 sets x Failure
Tricep Rope Pushdowns - 4 sets x 12 reps
Skull Crushers - 3 sets x 10 reps"""

    template.instructions = new_instructions
    db.commit()
    print(f" Updated instructions for '{template.name}' ({template.id})")
    print(" New content:")
    print(template.instructions)

except Exception as e:
    print(f" Error: {e}")
finally:
    db.close()
