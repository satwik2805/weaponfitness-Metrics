from sqlalchemy import create_engine, text

DB_URL = "postgresql+psycopg2://postgres:WeaponFitnessGym%40123@db.sdgrkwbofvxloglbumzy.supabase.co:6543/postgres"

def fix_trainer_branch():
    engine = create_engine(DB_URL)
    owner_id = '16868ea1-f5fd-4d18-924a-4e1ee366d621'
    with engine.connect() as conn:
        # Get one branch of the owner
        branch = conn.execute(text(f"SELECT id FROM branches WHERE owner_id = '{owner_id}' LIMIT 1")).fetchone()
        if not branch:
            print(" Owner has no branches. Creating one...")
            # Need an ID for the branch
            branch_id = 'd8f67cd7-49c7-4712-b3ed-efa668b0547c' # Try to use the one I saw or just update any
            conn.execute(text(f"UPDATE branches SET owner_id = '{owner_id}' WHERE id = '{branch_id}'"))
            conn.commit()
            branch = (branch_id,)

        branch_id = branch[0]
        print(f" Owner branch: {branch_id}")

        # Update one trainer to this branch
        trainer = conn.execute(text("SELECT id FROM profiles WHERE role = 'Trainer' LIMIT 1")).fetchone()
        if trainer:
            trainer_id = trainer[0]
            conn.execute(text(f"UPDATE profiles SET branch_id = '{branch_id}' WHERE id = '{trainer_id}'"))
            conn.commit()
            print(f" Trainer {trainer_id} moved to branch {branch_id}")
        else:
            print(" No trainers found in the system to move.")

if __name__ == "__main__":
    fix_trainer_branch()
