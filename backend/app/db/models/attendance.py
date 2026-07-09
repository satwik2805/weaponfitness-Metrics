# app/db/models/attendance.py
from sqlalchemy import Column, Date, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"), nullable=True)
    
    attendance_date = Column(Date, nullable=False)
    is_present = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
