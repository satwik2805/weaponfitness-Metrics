import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def check_trainer():
    email = "trainer@gmail.com"
    print(f"Checking for {email}...")
    
    # Check profile
    res = supabase.table("profiles").select("id, role, full_name").ilike("email", email).execute()
    if not res.data:
        print(f"No profile found for {email}")
        # List some typical profiles
        res_all = supabase.table("profiles").select("email, role").limit(10).execute()
        print("Existing profiles:", res_all.data)
        return
        
    profile = res.data[0]
    print(f"Profile found: {profile}")
    
    if profile['role'] != 'Trainer':
        print(f"Warning: Role is {profile['role']}, updating to Trainer...")
        supabase.table("profiles").update({"role": "Trainer"}).eq("id", profile['id']).execute()
        print("Role updated.")
        
    # Check trainer table
    res_t = supabase.table("trainers").select("*").eq("id", profile['id']).execute()
    if not res_t.data:
        print(f"No entry in 'trainers' table for ID {profile['id']}. Creating one...")
        supabase.table("trainers").insert({
            "id": profile['id'],
            "experience_years": 5,
            "bio": "Expert Fitness Trainer"
        }).execute()
        print("Trainer entry created.")
    else:
        print(f"Trainer table data: {res_t.data[0]}")

if __name__ == "__main__":
    check_trainer()
