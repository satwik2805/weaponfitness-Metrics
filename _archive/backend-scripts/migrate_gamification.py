from sqlalchemy import text
from app.core.database import engine

def add_columns():
    with engine.connect() as conn:
        print("Adding xp and level columns to trainees table...")
        try:
            conn.execute(text("ALTER TABLE trainees ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;"))
            conn.execute(text("ALTER TABLE trainees ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;"))
            # Initialize null values
            conn.execute(text("UPDATE trainees SET xp = 0 WHERE xp IS NULL;"))
            conn.execute(text("UPDATE trainees SET level = 1 WHERE level IS NULL;"))
            conn.commit()
            print("Successfully added and initialized columns.")
        except Exception as e:
            print(f"Error adding columns: {e}")

if __name__ == "__main__":
    add_columns()
