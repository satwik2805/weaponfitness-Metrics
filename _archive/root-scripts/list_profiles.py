import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
res = db.execute(text("SELECT id, full_name, role FROM profiles")).fetchall()
print("All Profiles:")
for r in res:
    print(f"ID: {r[0]}, Name: {r[1]}, Role: {r[2]}")
db.close()
