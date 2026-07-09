from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base
import app.db.models  # noqa: F401 — registers all models on Base

# DATABASE_URL is required by Settings — there is deliberately no fallback
# (a hardcoded production credential used to live here; see SECURITY.md S8).
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
