import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
res = db.execute(text("SELECT id, full_name, role FROM profiles WHERE full_name ILIKE '%Trainer%'")).fetchall()
print("Trainer-like Profiles:")
for r in res:
    print(f"ID: {r[0]}, Name: {r[1]}, Role: {r[2]}")
    # Also check if they are in the 'trainers' table
    t_res = db.execute(text(f"SELECT * FROM trainers WHERE id = '{r[0]}'")).fetchone()
    print(f" - In trainers table: {'Yes' if t_res else 'No'}")

db.close()
