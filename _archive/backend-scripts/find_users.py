from sqlalchemy import create_engine, text

DB_URL = "postgresql+psycopg2://postgres:WeaponFitnessGym%40123@db.sdgrkwbofvxloglbumzy.supabase.co:6543/postgres"

def find_admin():
    engine = create_engine(DB_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT profiles.full_name, profiles.role, auth.users.email FROM profiles JOIN auth.users ON profiles.id = auth.users.id")).fetchall()
        for row in result:
            print(f"User: {row.full_name} | Role: {row.role} | Email: {row.email}")

if __name__ == "__main__":
    find_admin()
