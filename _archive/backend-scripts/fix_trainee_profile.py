"""
Quick script to create trainee profile for trainee@gmail.com
Uses the existing database connection
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from sqlalchemy import text

def create_trainee_profile():
    db = SessionLocal()
    try:
        # Get user_id for trainee@gmail.com from Supabase auth
        # Note: We need to query the auth.users table
        result = db.execute(text("""
            SELECT id FROM auth.users WHERE email = 'trainee@gmail.com'
        """))
        user_row = result.fetchone()
        
        if not user_row:
            print(" User trainee@gmail.com not found in auth.users")
            print("Please make sure you've created this user in Supabase Auth first")
            return False
        
        user_id = user_row[0]
        print(f" Found user_id: {user_id}")
        
        # Check if trainee already exists (logic: check by id, which is the user_id)
        result = db.execute(text("""
            SELECT id FROM trainees WHERE id = :user_id
        """), {"user_id": user_id})
        existing = result.fetchone()
        
        if existing:
            print(f" Trainee profile already exists (ID: {existing[0]})")
            return True
        
        # Create/update profile record first (it's the parent table)
        # Note: profiles table usually has id, full_name, email, role
        db.execute(text("""
            INSERT INTO profiles (id, full_name, email, role)
            VALUES (:user_id, 'Test Trainee', 'trainee@gmail.com', 'trainee')
            ON CONFLICT (id) DO UPDATE
            SET full_name = EXCLUDED.full_name,
                email = EXCLUDED.email,
                role = EXCLUDED.role
        """), {"user_id": user_id})
        
        # Create trainee record
        # Trainees table has id as PK which is FK to profiles.id
        result = db.execute(text("""
            INSERT INTO trainees (id, xp, level)
            VALUES (:user_id, 0, 1)
            RETURNING id
        """), {"user_id": user_id})
        trainee_id = result.fetchone()[0]
        
        db.commit()

        print(f" Created trainee profile (ID: {trainee_id})")
        print(f" Profile record created/updated")
        print(f"\n Success! You can now log in and use the app.")
        return True
        
    except Exception as e:
        db.rollback()
        print(f" Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    create_trainee_profile()
