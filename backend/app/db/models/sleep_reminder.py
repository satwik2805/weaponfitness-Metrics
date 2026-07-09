from sqlalchemy import Column, Time, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class SleepReminder(Base):
    __tablename__ = "sleep_reminders"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"), nullable=False)

    bedtime = Column(Time, nullable=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
