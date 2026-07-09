from sqlalchemy import create_engine, text
from app.core.database import DB_URL

def fix_columns():
    engine = create_engine(DB_URL)
    with engine.connect() as conn:
        print("Dropping existing nutrition tables to fix schema mismatch...")
        conn.execute(text("DROP TABLE IF EXISTS nutrition_logs CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS nutrient_goals CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS daily_nutrition CASCADE"))
        conn.commit()
    
    # Re-import and create
    from app.db.base import Base
    from app.db.models.nutrition_log import NutritionLog
    from app.db.models.nutrient_goal import NutrientGoal
    from app.db.models.daily_nutrition import DailyNutrition
    
    print("Re-creating tables with correct columns...")
    Base.metadata.create_all(bind=engine)
    print(" Tables recreated successfully.")

if __name__ == "__main__":
    fix_columns()
