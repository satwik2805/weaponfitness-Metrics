from sqlalchemy.orm import Session
from app.db.models.profile import Profile
from app.schemas.profile import ProfileCreate
import uuid

def create_profile(db: Session, data: ProfileCreate):
    obj = Profile(
        id=uuid.uuid4(),
        full_name=data.full_name,
        phone=data.phone,
        role=data.role
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def list_profiles(db: Session):
    return db.query(Profile).all()
