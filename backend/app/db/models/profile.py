# app/db/models/profile.py

from sqlalchemy import Column, Text, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.enums import UserRoleEnum
from app.db.types import GUID


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(GUID(), primary_key=True)

    full_name = Column(Text)
    phone = Column(Text)
    profile_image = Column(Text)

    role = Column(
        Enum(UserRoleEnum),
        default=UserRoleEnum.Trainee,
        nullable=False
    )

    branch_id = Column(
        GUID(),
        ForeignKey("branches.id", ondelete="SET NULL")
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    last_login = Column(DateTime(timezone=True))

    profile_updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
