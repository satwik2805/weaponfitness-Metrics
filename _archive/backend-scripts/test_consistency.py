import sys
import os
from datetime import date, timedelta
from uuid import UUID

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.db.models.trainee import Trainee
from app.db.models.attendance import Attendance
from app.db.models.workout_log import WorkoutLog
from app.db.models.sleep import SleepLog
from app.services.consistency_service import update_daily_consistency

def mock_consistency_for_trainee(trainee_id_str: str):
    db = SessionLocal()
    try:
        trainee_id = UUID(trainee_id_str)
        trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
        
        if not trainee:
            print(f" Trainee {trainee_id_str} not found.")
            return

        print(f" Mocking 5 days of consistency for {trainee_id_str}...")
        
        # We'll create data for the last 5 days
        today = date.today()
        for i in range(5):
            target_date = today - timedelta(days=i)
            
            # Create Attendance
            if not db.query(Attendance).filter(Attendance.trainee_id == trainee_id, Attendance.attendance_date == target_date).first():
                db.add(Attendance(trainee_id=trainee_id, attendance_date=target_date, is_present=True))
            
            # Create Workout Log
            if not db.query(WorkoutLog).filter(WorkoutLog.trainee_id == trainee_id, WorkoutLog.workout_date == target_date).first():
                db.add(WorkoutLog(trainee_id=trainee_id, workout_date=target_date, is_completed=True))
                
            # Create Sleep Log
            if not db.query(SleepLog).filter(SleepLog.trainee_id == trainee_id, SleepLog.sleep_date == target_date).first():
                db.add(SleepLog(trainee_id=trainee_id, sleep_date=target_date, total_hours=8.0, score=90))
        
        db.commit()
        
        # Trigger consistency updates for all these days
        for i in range(5):
            target_date = today - timedelta(days=i)
            update_daily_consistency(db, trainee_id, target_date)
            
        print(" Success! 5/5 Trifecta days created for this week.")
        print(" Now refresh your App. The Level Lock should be GONE and the milestone should show 5/5.")

    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_consistency.py <TRAINEE_UUID>")
    else:
        mock_consistency_for_trainee(sys.argv[1])
