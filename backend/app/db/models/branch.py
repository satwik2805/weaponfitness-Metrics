from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID

class Branch(Base):
    __tablename__ = "branches"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    branch_name = Column(Text, nullable=False)
    address = Column(Text)
    contact_number = Column(Text)

    owner_id = Column(GUID(), ForeignKey("profiles.id", ondelete="RESTRICT"), nullable=False)

    allow_trainer_renewal = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
