from app.core.database import SessionLocal
from app.db.models.trainee import Trainee
from sqlalchemy import select

def check_trainees():
    db = SessionLocal()
    try:
        trainees = db.query(Trainee).all()
        for t in trainees:
            print(f"Trainee ID: {t.id}, XP: {t.xp}, Level: {t.level}")
    finally:
        db.close()

if __name__ == "__main__":
    check_trainees()
