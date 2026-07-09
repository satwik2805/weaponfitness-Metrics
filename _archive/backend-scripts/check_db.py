from app.core.database import engine
from sqlalchemy import text

def check_connection():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("Successfully connected to the database!")
            return True
    except Exception as e:
        print(f"Failed to connect to the database: {e}")
        return False

if __name__ == "__main__":
    check_connection()
