from sqlalchemy import Column, Date, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class TrainerAttendance(Base):
    __tablename__ = "trainer_attendance"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    trainer_id = Column(GUID(), ForeignKey("trainers.id", ondelete="CASCADE"), nullable=False)
    attendance_date = Column(Date, nullable=False)
    is_present = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
