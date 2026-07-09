from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID

class NutritionLog(Base):
    __tablename__ = "nutrition_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"), nullable=False)
    
    log_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    meal_name = Column(String, nullable=False) # Breakfast, Lunch, etc.
    item_name = Column(String, nullable=False)
    
    calories = Column(Float, default=0.0)
    protein = Column(Float, default=0.0)
    carbs = Column(Float, default=0.0)
    fats = Column(Float, default=0.0)
    
    quantity = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
