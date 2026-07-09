"""
Script to create a trainee profile for an existing user
Run this to link your Supabase auth user to a trainee record
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for admin operations

if not SUPABASE_URL or not SUPABASE_KEY:
    print(" Missing Supabase credentials in .env file")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_trainee_for_user(email: str, full_name: str = None):
    """Create a trainee record for an existing auth user"""
    try:
        # 1. Get the user by email
        response = supabase.auth.admin.list_users()
        users = response
        
        user = None
        for u in users:
            if u.email == email:
                user = u
                break
        
        if not user:
            print(f" No user found with email: {email}")
            return
        
        user_id = user.id
        print(f" Found user: {email} (ID: {user_id})")
        
        # 2. Check if trainee already exists
        existing = supabase.table('trainees').select('*').eq('user_id', user_id).execute()
        if existing.data and len(existing.data) > 0:
            print(f" Trainee profile already exists (ID: {existing.data[0]['id']})")
            return existing.data[0]['id']
        
        # 3. Create trainee record
        trainee_data = {
            'user_id': user_id,
            'full_name': full_name or email.split('@')[0],
            'email': email
        }
        
        result = supabase.table('trainees').insert(trainee_data).execute()
        
        if result.data and len(result.data) > 0:
            trainee_id = result.data[0]['id']
            print(f" Created trainee profile (ID: {trainee_id})")
            return trainee_id
        else:
            print(f" Failed to create trainee profile")
            return None
            
    except Exception as e:
        print(f" Error: {e}")
        return None

if __name__ == "__main__":
    # Replace with your actual email
    email = input("Enter the trainee email address: ").strip()
    full_name = input("Enter full name (optional, press Enter to skip): ").strip() or None
    
    trainee_id = create_trainee_for_user(email, full_name)
    
    if trainee_id:
        print(f"\n Success! You can now use the app with this account.")
    else:
        print(f"\n Failed to create trainee profile. Check the errors above.")
