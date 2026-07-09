from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Date
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID

class DailyNutrition(Base):
    __tablename__ = "daily_nutrition"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"), nullable=False)
    
    date = Column(Date, nullable=False)
    
    quality_rating = Column(Integer) # 1-10
    notes = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
