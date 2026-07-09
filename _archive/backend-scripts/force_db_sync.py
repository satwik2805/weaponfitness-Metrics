from sqlalchemy import create_engine
from app.core.database import DB_URL
from app.db.models.nutrition_log import NutritionLog
from app.db.models.nutrient_goal import NutrientGoal
from app.db.models.daily_nutrition import DailyNutrition

def force_create():
    engine = create_engine(DB_URL)
    print(f"Force creating nutrition tables on {DB_URL.split('@')[1].split('/')[0]}...")
    
    # Use the table objects directly
    NutritionLog.__table__.create(bind=engine, checkfirst=True)
    print("   nutrition_logs")
    
    NutrientGoal.__table__.create(bind=engine, checkfirst=True)
    print("   nutrient_goals")
    
    DailyNutrition.__table__.create(bind=engine, checkfirst=True)
    print("   daily_nutrition")
    
    print("\nAll nutrition tables verified/created.")

if __name__ == "__main__":
    force_create()
