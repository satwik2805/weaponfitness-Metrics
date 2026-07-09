from app.core.database import SessionLocal
from app.db.models.profile import Profile
from app.db.models.trainee import Trainee
from app.db.enums import UserRoleEnum

def check_missing_trainees():
    db = SessionLocal()
    try:
        # Get all profiles that are trainees
        trainee_profiles = db.query(Profile).filter(Profile.role == "Trainee").all()
        print(f"Found {len(trainee_profiles)} trainee profiles.")
        
        missing_count = 0
        for profile in trainee_profiles:
            trainee = db.query(Trainee).filter(Trainee.id == profile.id).first()
            if not trainee:
                print(f" Missing Trainee record for: {profile.full_name} ({profile.id})")
                missing_count += 1
        
        if missing_count == 0:
            print(" All trainee profiles have matching Trainee records.")
        else:
            print(f" Found {missing_count} missing trainee records.")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_missing_trainees()
