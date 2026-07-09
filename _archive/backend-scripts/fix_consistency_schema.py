from sqlalchemy import text
from app.core.database import SessionLocal, engine

def fix_schema():
    print(" Checking consistency_progress schema...")
    with engine.connect() as connection:
        # Check if column exists
        result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='consistency_progress' AND column_name='diet_met'"))
        if not result.fetchone():
            print(" 'diet_met' column missing. Adding it now...")
            try:
                connection.execute(text("ALTER TABLE consistency_progress ADD COLUMN diet_met BOOLEAN DEFAULT FALSE"))
                connection.commit()
                print(" 'diet_met' column added successfully.")
            except Exception as e:
                print(f" Failed to add column: {e}")
        else:
            print(" 'diet_met' column already exists.")

if __name__ == "__main__":
    fix_schema()
