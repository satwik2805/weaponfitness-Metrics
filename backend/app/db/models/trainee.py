from sqlalchemy import Column, Numeric, ForeignKey, DateTime, Integer
from sqlalchemy.sql import func
from app.db.base import Base
from app.db.types import GUID

class Trainee(Base):
    __tablename__ = "trainees"

    id = Column(GUID(), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    trainer_id = Column(GUID(), ForeignKey("trainers.id", ondelete="SET NULL"))

    bmi = Column(Numeric)
    weight = Column(Numeric)
    height = Column(Numeric)
    
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)

    last_absent_email_sent = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
