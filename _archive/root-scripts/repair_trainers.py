import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.core.database import SessionLocal
from app.db.models.profile import Profile
from app.db.models.trainer import Trainer
from app.db.enums import UserRoleEnum

db = SessionLocal()
# Fix for trainer@gmail.com
# We'll upgrade ANY profile that has 'trainer' in the name or current role
profiles = db.query(Profile).all()
for p in profiles:
    if "trainer" in p.full_name.lower() or p.role == UserRoleEnum.Trainer:
        print(f"Fixing authority for: {p.full_name} ({p.id})")
        p.role = UserRoleEnum.Trainer
        # Ensure trainer record
        trainer_rec = db.query(Trainer).filter(Trainer.id == p.id).first()
        if not trainer_rec:
            db.add(Trainer(id=p.id, experience_years=5, bio="Lead Trainer"))
            print(" - Record created")
        else:
            print(" - Record exists")
db.commit()
db.close()
print("All trainer accounts repaired.")
