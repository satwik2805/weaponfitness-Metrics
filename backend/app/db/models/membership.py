from sqlalchemy import Column, Text, Integer, Numeric, ForeignKey
import uuid

from app.db.base import Base
from app.db.types import GUID

class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    branch_id = Column(GUID(), ForeignKey("branches.id", ondelete="CASCADE"))

    plan_name = Column(Text, nullable=False)
    price = Column(Numeric(10,2), default=0)
    duration_months = Column(Integer, default=1)
    description = Column(Text)

