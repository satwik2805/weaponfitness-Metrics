from sqlalchemy import create_engine, text

DB_URL = "postgresql+psycopg2://postgres:WeaponFitnessGym%40123@db.sdgrkwbofvxloglbumzy.supabase.co:6543/postgres"

def verify_everything():
    engine = create_engine(DB_URL)
    owner_email = 'owner@test.com'
    with engine.connect() as conn:
        print(f"--- VERIFYING FOR {owner_email} ---")
        user = conn.execute(text("SELECT id FROM auth.users WHERE email = :email"), {"email": owner_email}).fetchone()
        if not user:
            print(" User not found in auth.users")
            return
        owner_id = user[0]
        print(f"Owner ID: {owner_id}")

        profile = conn.execute(text("SELECT role FROM profiles WHERE id = :id"), {"id": owner_id}).fetchone()
        print(f"Profile Role: {profile[0] if profile else 'NOT FOUND'}")

        branches = conn.execute(text("SELECT id, branch_name FROM branches WHERE owner_id = :id"), {"id": owner_id}).fetchall()
        branch_ids = [str(b[0]) for b in branches]
        print(f"Branches owned ({len(branches)}): {[b[1] for b in branches]}")

        if branch_ids:
            # Manually build the IN clause to avoid f-string issues
            ids_str = "', '".join(branch_ids)
            query = f"SELECT full_name, role, branch_id FROM profiles WHERE role = 'Trainer' AND branch_id::text IN ('{ids_str}')"
            trainers = conn.execute(text(query)).fetchall()
            print(f"Trainers found in these branches ({len(trainers)}):")
            for t in trainers:
                print(f"  - {t.full_name} (Role: {t.role})")
        else:
            print(" No branches found for this owner.")

if __name__ == "__main__":
    verify_everything()
