from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional

# Diet Library
class DietLibraryBase(BaseModel):
    name: str
    created_by: Optional[UUID] = None

class DietLibraryCreate(DietLibraryBase):
    diet_library_id: UUID

class DietLibraryResponse(DietLibraryBase):
    diet_library_id: UUID
    model_config = ConfigDict(from_attributes=True)


# Diet Meals
class DietMealBase(BaseModel):
    diet_id: UUID
    meal_name: str
    order_index: Optional[int] = None

class DietMealCreate(DietMealBase):
    diet_meals_id: UUID

class DietMealResponse(DietMealBase):
    diet_meals_id: UUID
    model_config = ConfigDict(from_attributes=True)


# Diet Items
class DietItemBase(BaseModel):
    meal_id: UUID
    item_name: str
    quantity: str
    calories: Optional[float] = 0.0
    protein: Optional[float] = 0.0
    carbs: Optional[float] = 0.0
    fats: Optional[float] = 0.0

class DietItemCreate(DietItemBase):
    diet_items_id: UUID

class DietItemResponse(DietItemBase):
    diet_items_id: UUID
    model_config = ConfigDict(from_attributes=True)
