from sqlalchemy import create_engine
from app.core.database import DB_URL
from app.db.base import Base
from app.db.models.daily_nutrition import DailyNutrition

def create_table():
    engine = create_engine(DB_URL)
    print("Creating daily_nutrition table...")
    
    DailyNutrition.__table__.create(bind=engine, checkfirst=True)
    print("   daily_nutrition")
    
    print("\n Table created successfully!")

if __name__ == "__main__":
    create_table()
