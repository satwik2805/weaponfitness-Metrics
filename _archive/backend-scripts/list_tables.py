import sys
import os
sys.path.append(os.getcwd())
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
res = db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
tables = [r[0] for r in res]
print("Tables in public schema:")
for t in sorted(tables):
    print(f" - {t}")
db.close()
