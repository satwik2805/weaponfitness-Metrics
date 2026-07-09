from sqlalchemy import create_engine, text

DB_URL = "postgresql+psycopg2://postgres:WeaponFitnessGym%40123@db.sdgrkwbofvxloglbumzy.supabase.co:6543/postgres"

def check_branch_data():
    engine = create_engine(DB_URL)
    owner_id = '16868ea1-f5fd-4d18-924a-4e1ee366d621' # owner@test.com
    with engine.connect() as conn:
        print(f"--- BRANCHES FOR OWNER {owner_id} ---")
        branches = conn.execute(text(f"SELECT id, branch_name FROM branches WHERE owner_id = '{owner_id}'")).fetchall()
        branch_ids = []
        for b in branches:
            print(f"Branch: {b.branch_name} | ID: {b.id}")
            branch_ids.append(b.id)
            
        print(f"\n--- TRAINERS IN SYSTEM ---")
        trainers = conn.execute(text("SELECT full_name, role, branch_id FROM profiles WHERE role = 'Trainer'")).fetchall()
        for t in trainers:
            is_owned = t.branch_id in branch_ids
            print(f"Trainer: {t.full_name} | Branch ID: {t.branch_id} | Owned: {is_owned}")

if __name__ == "__main__":
    check_branch_data()
