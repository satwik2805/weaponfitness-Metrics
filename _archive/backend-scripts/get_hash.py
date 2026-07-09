from sqlalchemy import create_engine, text

DB_URL = "postgresql+psycopg2://postgres:WeaponFitnessGym%40123@db.sdgrkwbofvxloglbumzy.supabase.co:6543/postgres"

def get_hash():
    engine = create_engine(DB_URL)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT encrypted_password FROM auth.users WHERE email = 'admin@test.com'")).fetchone()
        if res:
            print(f"HASH: {res[0]}")
        else:
            print("NOT FOUND")

if __name__ == "__main__":
    get_hash()
