
import os
import uuid
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = "https://sdgrkwbofvxloglbumzy.supabase.co"
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def check_diet():
    # Find trainee by email or name
    email = "chaya22791@gmail.com"
    profiles = supabase.table("profiles").select("id, full_name").eq("email", email).execute()
    
    if not profiles.data:
        print("Profile not found for email:", email)
        return

    trainee_id = profiles.data[0]['id']
    full_name = profiles.data[0]['full_name']
    print(f"Checking diet for {full_name} ({trainee_id})")

    # Get Group ID
    gm = supabase.table("group_members").select("group_id").eq("trainee_id", trainee_id).maybe_single().execute()
    group_id = gm.data['group_id'] if gm.data else None
    print(f"Group ID: {group_id}")

    days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    
    for day in days:
        print(f"\n--- Day: {day} ---")
        
        # Custom Diet
        custom = supabase.table("custom_trainee_diet").select("diet_id").eq("trainee_id", trainee_id).eq("day_name", day).maybe_single().execute()
        if custom.data:
            print(f"Custom Diet ID: {custom.data['diet_id']}")
        else:
            print("No Custom Diet")

        # Group Diet
        if group_id:
            group_weekly = supabase.table("group_weekly_diet").select("diet_id").eq("group_id", group_id).eq("day_name", day).maybe_single().execute()
            if group_weekly.data:
                print(f"Group Diet ID: {group_weekly.data['diet_id']}")
            else:
                print("No Group Diet")

if __name__ == "__main__":
    check_diet()
