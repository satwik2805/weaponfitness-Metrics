from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID

# ----------------------------------
# Workout Template
# ----------------------------------
class WorkoutTemplate(Base):
    __tablename__ = "workout_templates"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    creator_id = Column(GUID(), ForeignKey("trainers.id", ondelete="SET NULL"))
    name = Column(String, nullable=False)
    instructions = Column(Text)
    video_url = Column(String)
    image_url = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ----------------------------------
# Trainee Groups
# ----------------------------------
class TraineeGroup(Base):
    __tablename__ = "trainee_groups"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    group_name = Column(String, nullable=False)
    trainer_id = Column(GUID(), ForeignKey("trainers.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ----------------------------------
# Trainee Group Members (JOIN TABLE)
# ----------------------------------
class TraineeGroupMember(Base):
    __tablename__ = "trainee_group_members"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"))
    group_id = Column(GUID(), ForeignKey("trainee_groups.id", ondelete="CASCADE"))
    joined_at = Column(DateTime(timezone=True), server_default=func.now())


# ----------------------------------
# Group Weekly Workout
# ----------------------------------
class GroupWeeklyWorkout(Base):
    __tablename__ = "group_weekly_workouts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    group_id = Column(GUID(), ForeignKey("trainee_groups.id", ondelete="CASCADE"))
    day_name = Column(String, nullable=False)
    workout_template_id = Column(GUID(), ForeignKey("workout_templates.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ----------------------------------
# Group Monthly Workout
# ----------------------------------
class GroupMonthlyWorkout(Base):
    __tablename__ = "group_monthly_workouts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    group_id = Column(GUID(), ForeignKey("trainee_groups.id", ondelete="CASCADE"))
    date_day = Column(Integer, nullable=False)
    workout_template_id = Column(GUID(), ForeignKey("workout_templates.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ----------------------------------
# Custom Trainee Weekly Workout
# ----------------------------------
class CustomTraineeWeeklyWorkout(Base):
    __tablename__ = "custom_trainee_weekly_workouts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"))
    day_name = Column(String, nullable=False)
    workout_template_id = Column(GUID(), ForeignKey("workout_templates.id", ondelete="CASCADE"))
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
