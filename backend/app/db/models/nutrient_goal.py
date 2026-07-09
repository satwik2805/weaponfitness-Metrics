from sqlalchemy import Column, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID

class NutrientGoal(Base):
    __tablename__ = "nutrient_goals"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    daily_calories = Column(Float, default=2000.0)
    daily_protein = Column(Float, default=150.0)
    daily_carbs = Column(Float, default=200.0)
    daily_fats = Column(Float, default=70.0)
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
