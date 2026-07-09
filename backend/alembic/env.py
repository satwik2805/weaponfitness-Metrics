from logging.config import fileConfig
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from alembic import context

# ------------------------------------------------------------------
# Add project root to PYTHONPATH
# ------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR))

# ------------------------------------------------------------------
# Alembic Config
# ------------------------------------------------------------------
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The URL lives in the environment (backend/.env), never in alembic.ini.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")
_db_url = os.environ.get("DATABASE_URL")
if not _db_url:
    raise RuntimeError("DATABASE_URL is not set — configure backend/.env")
config.set_main_option("sqlalchemy.url", _db_url)

# ------------------------------------------------------------------
# Import ALL models so metadata is registered
# ------------------------------------------------------------------
import app.db.models  # noqa: F401
from app.db.base import Base  # <-- your declarative Base

target_metadata = Base.metadata

# ------------------------------------------------------------------
# Offline migrations
# ------------------------------------------------------------------
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


# ------------------------------------------------------------------
# Online migrations
# ------------------------------------------------------------------
def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
