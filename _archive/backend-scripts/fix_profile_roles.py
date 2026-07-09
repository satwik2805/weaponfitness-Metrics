import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Needs Service Key for update

if not SUPABASE_URL or not SUPABASE_KEY:
    print(" Missing Supabase credentials in .env file (SUPABASE_URL and SUPABASE_SERVICE_KEY required)")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fix_roles():
    print(" Checking for lowercase roles in 'profiles' table...")
    
    # 1. Fix "trainee" -> "Trainee"
    print("Fixing 'trainee' -> 'Trainee'...")
    try:
        response = supabase.table('profiles').update({'role': 'Trainee'}).eq('role', 'trainee').execute()
        # count is not directly in response.data for older supabase-py, but we can check if it worked
        print(f" Updated {len(response.data) if response.data else 0} trainee records.")
    except Exception as e:
        print(f" Error fixing trainees: {e}")

    # 2. Fix "trainer" -> "Trainer"
    print("Fixing 'trainer' -> 'Trainer'...")
    try:
        response = supabase.table('profiles').update({'role': 'Trainer'}).eq('role', 'trainer').execute()
        print(f" Updated {len(response.data) if response.data else 0} trainer records.")
    except Exception as e:
        print(f" Error fixing trainers: {e}")

    # 3. Fix "admin" -> "Admin"
    print("Fixing 'admin' -> 'Admin'...")
    try:
        response = supabase.table('profiles').update({'role': 'Admin'}).eq('role', 'admin').execute()
        print(f" Updated {len(response.data) if response.data else 0} admin records.")
    except Exception as e:
        print(f" Error fixing admins: {e}")

    print("\n Role check complete! All roles should now match the capitalized format required by the app.")

if __name__ == "__main__":
    fix_roles()
