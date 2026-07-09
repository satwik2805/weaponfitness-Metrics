from sqlalchemy import create_engine, text

DB_URL = "postgresql+psycopg2://postgres:WeaponFitnessGym%40123@db.sdgrkwbofvxloglbumzy.supabase.co:6543/postgres"

def check_owner():
    engine = create_engine(DB_URL)
    with engine.connect() as conn:
        print("--- AUTH USERS ---")
        user = conn.execute(text("SELECT id, email FROM auth.users WHERE email = 'owner@test.com'")).fetchone()
        if user:
            print(f"User found in auth.users: {user.email} (ID: {user.id})")
            
            print("\n--- PROFILES ---")
            profile = conn.execute(text(f"SELECT * FROM profiles WHERE id = '{user.id}'")).fetchone()
            if profile:
                print(f"Profile found: {profile}")
            else:
                print("No profile found for this ID.")
        else:
            print("User 'owner@test.com' NOT found in auth.users.")

if __name__ == "__main__":
    check_owner()
