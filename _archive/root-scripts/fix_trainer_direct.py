import sys
import os

# Add the backend directory to the sys.path so we can import app
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.database import SessionLocal
from app.db.models.profile import Profile
from app.db.models.trainer import Trainer
from app.db.enums import UserRoleEnum
import uuid

def fix_trainer():
    db = SessionLocal()
    email = "trainer@gmail.com"
    print(f"Checking database for: {email}")
    
    # We need to find the user in Supabase auth first? 
    # No, the 'profiles' table should have them if they signed up.
    # But wait, Profile table might not contain email if it's separate.
    # Let's check the profile schema again.
    
    # Wait, does Profile have email? 
    # Let's check app/db/models/profile.py again.
    
    # Actually, let's just browse ALL profiles to see what we have.
    profiles = db.query(Profile).all()
    print(f"Total profiles found: {len(profiles)}")
    
    target_profile = None
    for p in profiles:
        # Check if email exists in Profile model (it wasn't in the file I saw earlier)
        # Maybe I should check the table columns.
        pass

    # Since I don't see 'email' in the Profile model I viewed, maybe it's linked to 'auth.users'.
    # I will try to find a profile with role Trainer or search by name.
    
    # Let's try to search by name "Trainer" if the email is trainer@gmail.com
    target_profile = db.query(Profile).filter(Profile.full_name.ilike('%Trainer%')).first()
    
    if not target_profile:
        print("No profile with 'Trainer' in name found. Listing all profiles...")
        for p in profiles:
            print(f"ID: {p.id}, Name: {p.full_name}, Role: {p.role}")
        
        # If the user is trainer@gmail.com, maybe their ID is known?
        # I'll try to find any profile with role Trainee and change it to Trainer if it's the only one.
        # Better: let's look for the one with Trainer role first.
    
    if target_profile:
        print(f"Found profile: {target_profile.full_name}, ID: {target_profile.id}")
        if target_profile.role != UserRoleEnum.Trainer:
            print(f"Updating role from {target_profile.role} to Trainer...")
            target_profile.role = UserRoleEnum.Trainer
            db.add(target_profile)
        
        # Check if Trainer record exists
        trainer_rec = db.query(Trainer).filter(Trainer.id == target_profile.id).first()
        if not trainer_rec:
            print("Creating trainer record...")
            new_trainer = Trainer(
                id=target_profile.id,
                experience_years=5,
                bio="Lead Trainer"
            )
            db.add(new_trainer)
        else:
            print("Trainer record already exists.")
        
        db.commit()
        print("Success! Authority updated.")
    else:
        print("No trainer profile found to fix.")
    
    db.close()

if __name__ == "__main__":
    fix_trainer()
