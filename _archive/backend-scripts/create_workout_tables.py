# Create workout tracking tables
# Run this script to add workout_logs, workout_reminders, and push_tokens tables

from sqlalchemy import create_engine
from app.core.database import DB_URL
from app.db.base import Base
from app.db.models.workout_log import WorkoutLog
from app.db.models.workout_reminder import WorkoutReminder
from app.db.models.push_token import PushToken

# Import all models to ensure they're registered
from app.db.models import *

def create_workout_tracking_tables():
    """
    Creates the workout_logs, workout_reminders, and push_tokens tables.
    """
    engine = create_engine(DB_URL)
    
    print("Creating workout tracking and notification tables...")
    
    # Create the new tables
    WorkoutLog.__table__.create(bind=engine, checkfirst=True)
    print("   workout_logs")
    
    WorkoutReminder.__table__.create(bind=engine, checkfirst=True)
    print("   workout_reminders")
    
    PushToken.__table__.create(bind=engine, checkfirst=True)
    print("   push_tokens")
    
    print("\n All tables created successfully!")

if __name__ == "__main__":
    create_workout_tracking_tables()
