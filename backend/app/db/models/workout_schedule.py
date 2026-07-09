# app/db/models/workout_schedule.py
from sqlalchemy import Column, Date, ForeignKey
import uuid

from app.db.base import Base
from app.db.types import GUID

class WorkoutSchedule(Base):
    __tablename__ = "workout_schedules"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"))
    trainer_id = Column(GUID(), ForeignKey("trainers.id", ondelete="SET NULL"))

    workout_template_id = Column(GUID(), ForeignKey("workout_templates.id", ondelete="CASCADE"))

    scheduled_date = Column(Date, nullable=False)
