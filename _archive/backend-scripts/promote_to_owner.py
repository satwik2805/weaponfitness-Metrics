from sqlalchemy import create_engine, text

DB_URL = "postgresql+psycopg2://postgres:WeaponFitnessGym%40123@db.sdgrkwbofvxloglbumzy.supabase.co:6543/postgres"

def make_owner():
    engine = create_engine(DB_URL)
    with engine.connect() as conn:
        print("Changing admin@test.com to Owner role...")
        # Get ID first
        res = conn.execute(text("SELECT id FROM auth.users WHERE email = 'admin@test.com'")).fetchone()
        if res:
            user_id = res[0]
            conn.execute(text(f"UPDATE profiles SET role = 'Owner' WHERE id = '{user_id}'"))
            conn.commit()
            print(f" Updated role to Owner for {user_id}")
        else:
            print(" User admin@test.com not found.")

if __name__ == "__main__":
    make_owner()
