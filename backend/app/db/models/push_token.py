# app/db/models/push_token.py
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID

class PushToken(Base):
    """
    Stores Expo push tokens for sending notifications to trainees.
    """
    __tablename__ = "push_tokens"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    trainee_id = Column(GUID(), ForeignKey("trainees.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Expo push token
    push_token = Column(String, nullable=False)
    
    # Active status
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
