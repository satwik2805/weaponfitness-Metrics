from sqlalchemy import Column, Integer, Boolean, ForeignKey, Date, DateTime
from sqlalchemy.sql import func
import uuid
import datetime

from app.db.base import Base
from app.db.types import GUID

class ConsistencyProgress(Base):
    """
    Tracks daily and weekly goal completion for gamification.
    Meaningful habit formation: Levels are locked until weekly consistency is met.
    """
    __tablename__ = "consistency_progress"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"), nullable=False)
    
    date = Column(Date, nullable=False) # The specific day
    
    # Daily Goals
    attendance_met = Column(Boolean, default=False)
    workout_met = Column(Boolean, default=False)
    sleep_met = Column(Boolean, default=False)
    diet_met = Column(Boolean, default=False)
    
    # Trifecta: All 3 met on this day
    trifecta_met = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class WeeklyConsistency(Base):
    """
    Summarizes consistency for a specific week.
    Used to unlock Level Ups.
    """
    __tablename__ = "weekly_consistency"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"), nullable=False)
    
    week_start_date = Column(Date, nullable=False) # Monday of the week
    
    trifecta_days_count = Column(Integer, default=0) # Number of days in the week with trifecta_met=True
    milestone_achieved = Column(Boolean, default=False) # True if trifecta_days_count >= 5
    
    # This prevents multiple level-ups for the same milestone if we want to limit it, 
    # but the user said "level upgrades and rewards are unlocked ONLY after sustained completion".
    # So we'll use this as a gate.
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
