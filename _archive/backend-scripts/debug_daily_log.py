from app.core.database import SessionLocal
from app.db.models.daily_nutrition import DailyNutrition
from app.db.models.nutrition_log import NutritionLog
from app.db.models.nutrient_goal import NutrientGoal
from app.schemas.nutrition import DailyNutritionSummary
from uuid import UUID
from datetime import date, datetime
import uuid
from sqlalchemy import func

def test_summary_logic():
    db = SessionLocal()
    try:
        print("Testing get_daily_summary logic...")
        trainee_id = UUID("58e1a978-1393-47ee-8d21-e104909dfd45")
        query_date = date.today()
        
        # 1. Logs
        logs = db.query(NutritionLog).filter(
            NutritionLog.trainee_id == trainee_id,
            func.date(NutritionLog.log_date) == query_date
        ).all()
        print(f"Logs found: {len(logs)}")
        
        # 2. Goal
        goal = db.query(NutrientGoal).filter(NutrientGoal.trainee_id == trainee_id).first()
        if not goal:
            print("Goal not found, creating default...")
            goal = NutrientGoal(
                trainee_id=trainee_id,
                id=uuid.uuid4(),
                updated_at=datetime.now(),
                daily_calories=2000.0,
                daily_protein=150.0,
                daily_carbs=200.0,
                daily_fats=70.0
            )
        
        # 3. Daily Log
        daily_log = db.query(DailyNutrition).filter(
            DailyNutrition.trainee_id == trainee_id,
            DailyNutrition.date == query_date
        ).first()
        print(f"Daily log found: {daily_log}")
        
        # 4. Calculation
        total_cal = sum(l.calories for l in logs)
        total_pro = sum(l.protein for l in logs)
        total_carb = sum(l.carbs for l in logs)
        total_fat = sum(l.fats for l in logs)
        
        # 5. Pydantic
        print("Attempting Pydantic validation...")
        summary = DailyNutritionSummary(
            date=query_date,
            total_calories=total_cal,
            total_protein=total_pro,
            total_carbs=total_carb,
            total_fats=total_fat,
            goals=goal,
            logs=logs,
            daily_log=daily_log
        )
        print(" Serialization SUCCESS!")
        print(summary.model_dump_json(indent=2))
        
    except Exception as e:
        with open("debug_output.txt", "w") as f:
            f.write(" CRASH during logic:\n")
            import traceback
            traceback.print_exc(file=f)
    finally:
        db.close()

if __name__ == "__main__":
    test_summary_logic()
