# app/db/models/gym_class.py
"""Group classes + bookings — weekly recurring schedule, per-date bookings."""

import uuid
import enum

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Integer, SmallInteger, Text, Time, UniqueConstraint
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.types import GUID


class BookingStatusEnum(str, enum.Enum):
    Booked = "Booked"
    Cancelled = "Cancelled"
    Attended = "Attended"


class GymClass(Base):
    __tablename__ = "gym_classes"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    branch_id = Column(GUID(), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    trainer_id = Column(GUID(), ForeignKey("trainers.id", ondelete="SET NULL"))

    title = Column(Text, nullable=False)
    description = Column(Text)

    # weekly recurrence: 0=Monday … 6=Sunday (Python date.weekday())
    weekday = Column(SmallInteger, nullable=False)
    start_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)
    capacity = Column(Integer, nullable=False, default=20)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ClassBooking(Base):
    __tablename__ = "class_bookings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    class_id = Column(GUID(), ForeignKey("gym_classes.id", ondelete="CASCADE"), nullable=False)
    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"), nullable=False)

    class_date = Column(Date, nullable=False)
    status = Column(
        Enum(BookingStatusEnum, name="booking_status_enum"),
        nullable=False,
        default=BookingStatusEnum.Booked,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        # one live booking per member per class instance
        UniqueConstraint("class_id", "trainee_id", "class_date", name="uq_booking_member_instance"),
    )
