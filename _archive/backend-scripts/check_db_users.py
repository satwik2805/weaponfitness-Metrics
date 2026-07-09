import sqlalchemy
from sqlalchemy import create_engine, text
import os

DB_URL = "postgresql+psycopg2://postgres:WeaponFitnessGym%40123@db.sdgrkwbofvxloglbumzy.supabase.co:6543/postgres"

def check_users():
    engine = create_engine(DB_URL)
    with engine.connect() as conn:
        print("Checking profiles...")
        result = conn.execute(text("SELECT id, full_name, role FROM profiles"))
        for row in result:
            print(f"Profile: {row.full_name} | Role: {row.role} | ID: {row.id}")
        
        print("\nChecking auth.users...")
        # Note: auth schema might require specific permissions, but postgres user usually has them
        result = conn.execute(text("SELECT id, email FROM auth.users"))
        for row in result:
            print(f"Auth User: {row.email} | ID: {row.id}")

if __name__ == "__main__":
    check_users()
