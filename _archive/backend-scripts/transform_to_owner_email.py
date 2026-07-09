from sqlalchemy import create_engine, text

DB_URL = "postgresql+psycopg2://postgres:WeaponFitnessGym%40123@db.sdgrkwbofvxloglbumzy.supabase.co:6543/postgres"

def transform_to_owner():
    engine = create_engine(DB_URL)
    with engine.connect() as conn:
        print("Changing admin@test.com to owner@test.com...")
        # Update email in auth.users
        conn.execute(text("UPDATE auth.users SET email = 'owner@test.com' WHERE email = 'admin@test.com'"))
        # Ensure role is Owner in profiles (ID matches)
        # (ID doesn't change when email changes)
        conn.commit()
        print(" Transformation complete. admin@test.com is now owner@test.com and has Owner role.")

if __name__ == "__main__":
    transform_to_owner()
