import sys
import os

# Add the parent directory to sys.path so we can import 'app'
sys.path.append(os.getcwd())

from app.core.database import Base, engine
from app.db.models.nutrition_log import NutritionLog
from app.db.models.nutrient_goal import NutrientGoal
from app.db.models.daily_nutrition import DailyNutrition

def create_tables():
    print("Creating nutrition-related tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Successfully created tables: nutrition_logs, nutrient_goals, daily_nutrition")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    create_tables()
