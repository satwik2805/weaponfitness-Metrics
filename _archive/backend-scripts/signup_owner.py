import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

def create_owner():
    print(f"Attempting to create owner user at {SUPABASE_URL}...")
    
    # 1. Sign up the user
    signup_url = f"{SUPABASE_URL}/auth/v1/signup"
    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "email": "owner@test.com",
        "password": "12345678"
    }
    
    response = requests.post(signup_url, headers=headers, json=payload)
    if response.status_code == 200 or response.status_code == 201:
        user_data = response.json()
        user_id = user_data.get("id")
        print(f"User created in Auth! ID: {user_id}")
        return user_id
    else:
        print(f"Signup failed: {response.status_code} - {response.text}")
        # If user already exists, try to get ID from profiles if they have one
        return None

if __name__ == "__main__":
    create_owner()
