from app.schemas.nutrition import DailyNutritionSummary, DailyLogResponse, NutrientGoalResponse
from app.db.models.daily_nutrition import DailyNutrition
from app.db.models.nutrient_goal import NutrientGoal
import uuid
from datetime import date, datetime

def test_mock():
    print("Testing Mock Serialization...")
    
    # Mock Goal
    goal = NutrientGoal()
    goal.id = uuid.uuid4()
    goal.trainee_id = uuid.uuid4()
    goal.daily_calories = 2000
    goal.updated_at = datetime.now()
    
    # Mock Log
    log = DailyNutrition()
    log.id = uuid.uuid4()
    log.trainee_id = goal.trainee_id
    log.date = date.today()
    log.quality_rating = 8
    log.notes = "Good"
    log.updated_at = datetime.now()
    
    try:
        print("Serializing...")
        summary = DailyNutritionSummary(
            date=date.today(),
            total_calories=100,
            total_protein=10,
            total_carbs=10,
            total_fats=5,
            goals=goal,
            logs=[],
            daily_log=log
        )
        print(" SUCCESS")
        print(summary.model_dump_json())
    except Exception as e:
        with open("debug_mock_out.txt", "w") as f:
            f.write(" FAILED\n")
            f.write(str(e) + "\n")
            import traceback
            traceback.print_exc(file=f)

if __name__ == "__main__":
    test_mock()
