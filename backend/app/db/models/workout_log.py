# app/db/models/workout_log.py
from sqlalchemy import Column, Date, DateTime, ForeignKey, Boolean, Text, Integer
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID

class WorkoutLog(Base):
    """
    Tracks completed workouts automatically from gym attendance.
    Created when a trainee marks attendance at the gym.
    """
    __tablename__ = "workout_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"), nullable=False)
    attendance_id = Column(GUID(), ForeignKey("attendance.id", ondelete="CASCADE"), nullable=True)
    workout_template_id = Column(GUID(), ForeignKey("workout_templates.id", ondelete="SET NULL"), nullable=True)
    
    workout_date = Column(Date, nullable=False)
    
    # Workout completion details
    is_completed = Column(Boolean, default=True)
    duration_minutes = Column(Integer, nullable=True)  # Optional: how long they worked out
    notes = Column(Text, nullable=True)  # Optional: trainee notes about the workout
    
    # Auto-tracking metadata
    auto_tracked = Column(Boolean, default=True)  # True if created from attendance
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
