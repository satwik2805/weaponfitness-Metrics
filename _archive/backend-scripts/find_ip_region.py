import sqlalchemy
from sqlalchemy import create_engine
import sys

# Project: sdgrkwbofvxloglbumzy
# User: postgres.sdgrkwbofvxloglbumzy
# Pass: WeaponFitnessGym@123

candidates = [
    {"region": "ap-south-1 (Mumbai)", "ip": "3.111.105.85"},
    {"region": "ap-southeast-1 (Singapore)", "ip": "54.255.219.82"},
    {"region": "us-east-1 (N. Virginia)", "ip": "44.216.29.125"},
    {"region": "eu-central-1 (Frankfurt)", "ip": "52.209.89.87"},
    {"region": "eu-west-2 (London)", "ip": "18.169.213.251"}
]

password = "WeaponFitnessGym%40123"
user = "postgres.sdgrkwbofvxloglbumzy"
db_name = "postgres"

print(" Scanning Supabase IPs directly...")

for c in candidates:
    region = c['region']
    ip = c['ip']
    
    # Supavisor Port 6543
    url = f"postgresql://{user}:{password}@{ip}:5432/{db_name}"
    
    print(f" Testing {region} [{ip}]...", end="")
    try:
        engine = create_engine(url, connect_args={'connect_timeout': 4})
        with engine.connect() as conn:
            print("  SUCCESS!")
            print(f"FOUND VALID CONNECTION: {ip}")
            sys.exit(0)
    except Exception as e:
        msg = str(e)
        if "tenant or user not found" in msg:
            print("  Tenant not found (Wrong Region)")
        elif "password authentication failed" in msg:
            print("  SUCCESS (Auth failed = Tenant Found!)") 
            print(f"FOUND VALID IP: {ip}")
            sys.exit(0)
        else:
            print(f"  Error: {msg[:100]}...")
            
print(" Could not connect to any candidate IP.")
