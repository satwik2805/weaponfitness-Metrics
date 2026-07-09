import sqlalchemy
from sqlalchemy import create_engine
import sys

# Project Ref: sdgrkwbofvxloglbumzy
# Password: WeaponFitnessGym@123
# User: postgres.sdgrkwbofvxloglbumzy

regions = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
    "eu-central-1", "eu-west-1", "eu-west-2", "eu-north-1", "eu-west-3",
    "sa-east-1", "ca-central-1"
]

password = "WeaponFitnessGym%40123"
user = "postgres.bzoocycvpkcgjarqzmop"
db_name = "postgres"

print(" Scanning Supabase Regions for Project 'sdgrkwbofvxloglbumzy'...")

for region in regions:
    host = f"aws-0-{region}.pooler.supabase.com"
    # Try Session Mode (6543)
    url = f"postgresql://{user}:{password}@{host}:6543/{db_name}"
    
    print(f" Testing {region}...", end="")
    try:
        engine = create_engine(url, connect_args={'connect_timeout': 3})
        with engine.connect() as conn:
            print("  SUCCESS!")
            print(f"FOUND VALID REGION: {region}")
            print(f"Use Host: {host}")
            sys.exit(0)
    except Exception as e:
        msg = str(e)
        if "tenant or user not found" in msg:
            print("  Tenant not found (Region is valid, but project not here)")
        elif "could not translate host name" in msg:
            print("  DNS Error (Region likely invalid or unreachable)")
        elif "Is the server running" in msg:
            print("  Connection Timeout/Refused")
        elif "password authentication failed" in msg:
            print("  SUCCESS (Auth failed means Region IS Correct!)") 
            # If we get Auth Error, it found the tenant but password implies it's the right place (or generic).
            # Actually Supavisor checks tenant first.
            print(f"FOUND VALID REGION: {region}")
            sys.exit(0)
        else:
            print(f"  Error: {msg[:50]}...")
            
print(" Could not find valid region in list.")
