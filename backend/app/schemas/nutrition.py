from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import date, datetime
from typing import Optional, List

# Nutrition Log
class NutritionLogBase(BaseModel):
    trainee_id: UUID
    log_date: Optional[datetime] = None
    meal_name: str
    item_name: str
    calories: float = 0.0
    protein: float = 0.0
    carbs: float = 0.0
    fats: float = 0.0
    quantity: Optional[str] = None

class NutritionLogCreate(NutritionLogBase):
    pass

class NutritionLogResponse(NutritionLogBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Nutrient Goal
class NutrientGoalBase(BaseModel):
    trainee_id: UUID
    daily_calories: float = 2000.0
    daily_protein: float = 150.0
    daily_carbs: float = 200.0
    daily_fats: float = 70.0

class NutrientGoalCreate(NutrientGoalBase):
    pass

class NutrientGoalResponse(NutrientGoalBase):
    id: UUID
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Daily Log (Reflection)
class DailyLogBase(BaseModel):
    trainee_id: UUID
    date: date
    quality_rating: Optional[int] = None
    notes: Optional[str] = None

class DailyLogCreate(DailyLogBase):
    pass

class DailyLogResponse(DailyLogBase):
    id: UUID
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Daily Summary
class DailyNutritionSummary(BaseModel):
    date: date
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fats: float
    goals: Optional[NutrientGoalResponse] = None
    logs: List[NutritionLogResponse] = []
    daily_log: Optional[DailyLogResponse] = None
