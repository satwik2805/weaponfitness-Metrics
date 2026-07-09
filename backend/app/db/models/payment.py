from sqlalchemy import Column, Numeric, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy import Enum
from app.db.base import Base
from app.db.types import GUID
import enum

class PaymentModeEnum(str, enum.Enum):
    Cash = "Cash"
    Card = "Card"
    UPI = "UPI"

class PaymentStatusEnum(str, enum.Enum):
    Completed = "Completed"
    Pending = "Pending"
    Failed = "Failed"

class Payment(Base):
    __tablename__ = "payments"

    id = Column(GUID(), primary_key=True)
    profile_id = Column(GUID(), nullable=False)

    amount = Column(Numeric(10, 2), nullable=False)

    payment_mode = Column(Enum(PaymentModeEnum, name="payment_mode_enum"), nullable=False)
    payment_status = Column(Enum(PaymentStatusEnum, name="payment_status_enum"), nullable=False)

    receipt_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
