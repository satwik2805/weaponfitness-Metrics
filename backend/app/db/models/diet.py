from sqlalchemy import Column, String, Time, Integer, ForeignKey, DateTime, Float
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


# ----------------------------------
# Diet Library (Master Diet Template)
# ----------------------------------
class DietLibrary(Base):
    __tablename__ = "diet_library"

    diet_library_id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_by = Column(GUID(), ForeignKey("profiles.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ----------------------------------
# Diet Meals (Breakfast, Lunch, etc.)
# ----------------------------------
class DietMeal(Base):
    __tablename__ = "diet_meals"

    diet_meals_id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    diet_id = Column(GUID(), ForeignKey("diet_library.diet_library_id", ondelete="CASCADE"))
    meal_name = Column(String, nullable=False)
    order_index = Column(Integer, default=1)


# ----------------------------------
# Diet Items
# ----------------------------------
class DietItem(Base):
    __tablename__ = "diet_items"

    diet_items_id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    meal_id = Column(GUID(), ForeignKey("diet_meals.diet_meals_id", ondelete="CASCADE"))
    item_name = Column(String, nullable=False)
    quantity = Column(String, nullable=False)
    time_slot = Column(Time)
    
    # Macros
    calories = Column(Float, default=0.0)
    protein = Column(Float, default=0.0)
    carbs = Column(Float, default=0.0)
    fats = Column(Float, default=0.0)

    order_index = Column(Integer, default=1)


# ----------------------------------
# Weekly Group Diet
# ----------------------------------
class GroupWeeklyDiet(Base):
    __tablename__ = "group_weekly_diet"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    group_id = Column(GUID(), ForeignKey("trainee_groups.id", ondelete="CASCADE"))
    day_name = Column(String, nullable=False)
    diet_id = Column(GUID(), ForeignKey("diet_library.diet_library_id", ondelete="SET NULL"))
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())


# ----------------------------------
# Custom Trainee Diet
# ----------------------------------
class CustomTraineeDiet(Base):
    __tablename__ = "custom_trainee_diet"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"))
    day_name = Column(String, nullable=False)
    diet_id = Column(GUID(), ForeignKey("diet_library.diet_library_id", ondelete="SET NULL"))
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
