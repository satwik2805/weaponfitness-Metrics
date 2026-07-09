from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional
from datetime import datetime

class WorkoutTemplateBase(BaseModel):
    creator_id: Optional[UUID] = None
    name: str
    instructions: Optional[str] = None
    video_url: Optional[str] = None
    image_url: Optional[str] = None

class WorkoutTemplateCreate(WorkoutTemplateBase):
    id: UUID

class WorkoutTemplateResponse(WorkoutTemplateBase):
    id: UUID
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
