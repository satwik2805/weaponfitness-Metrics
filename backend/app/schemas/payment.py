from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional
from enum import Enum

class PaymentModeEnum(str, Enum):
    Cash = "Cash"
    Card = "Card"
    UPI = "UPI"

class PaymentStatusEnum(str, Enum):
    Completed = "Completed"
    Pending = "Pending"
    Failed = "Failed"

class PaymentCreate(BaseModel):
    id: UUID
    profile_id: UUID
    amount: float
    payment_mode: PaymentModeEnum
    payment_status: PaymentStatusEnum
    receipt_url: Optional[str] = None

class PaymentResponse(PaymentCreate):
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
