
from sqlalchemy import Column, Date, Time, Float, DateTime, String, Integer
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.core.database import Base


class SleepLog(Base):
    __tablename__ = "sleep_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trainee_id = Column(UUID(as_uuid=True), nullable=False)

    sleep_date = Column(Date, nullable=False)
    sleep_start = Column(Time)
    sleep_end = Column(Time)
    
    total_hours = Column(Float)
    total_sleep_minutes = Column(Integer, default=0)
    
    #  ELITE VERSION FIELDS
    woke_up_count = Column(Integer, default=0)
    deep_sleep_rating = Column(Integer, nullable=True) # 1-10
    sleep_quality_notes = Column(String, nullable=True)
    
    score = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
