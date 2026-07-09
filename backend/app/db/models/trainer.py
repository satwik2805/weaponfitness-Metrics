from sqlalchemy import Column, Integer, Numeric, Text, ForeignKey
from app.db.base import Base
from app.db.types import GUID

class Trainer(Base):
    __tablename__ = "trainers"

    id = Column(GUID(), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    experience_years = Column(Integer)
    rating_avg = Column(Numeric(3, 2))
    bio = Column(Text)
