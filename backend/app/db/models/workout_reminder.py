# app/db/models/workout_reminder.py
from sqlalchemy import Column, Time, Boolean, ForeignKey, DateTime, String
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID

class WorkoutReminder(Base):
    """
    Stores workout reminder preferences for trainees.
    Scheduler checks these and sends notifications.
    """
    __tablename__ = "workout_reminders"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"), nullable=False)
    
    # Reminder time
    reminder_time = Column(Time, nullable=False)
    
    # Days of week (comma-separated: "Monday,Wednesday,Friday")
    days_of_week = Column(String, nullable=True)  # If null, every day
    
    # Reminder message (optional custom message)
    message = Column(String, nullable=True)
    
    # Active status
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
