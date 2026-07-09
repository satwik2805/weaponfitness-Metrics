from sqlalchemy.orm import Session
from app.db.models.trainer import Trainer
from app.schemas.trainer import TrainerCreate
import uuid

def create_trainer(db: Session, data: TrainerCreate, profile_id):
    obj = Trainer(
        id=profile_id,
        experience_years=data.experience_years,
        bio=data.bio
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def list_trainers(db: Session):
    return db.query(Trainer).all()
