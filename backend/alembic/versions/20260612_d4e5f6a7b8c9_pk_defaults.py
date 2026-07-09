"""Server-side UUID defaults on every GUID primary key.

Python-side uuid4 defaults only fire through SQLAlchemy; PostgREST (the
client's direct path) inserts NULL ids without these. The old database had
them; the canonical schema must too (audit: server PK defaults).

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        do $$
        declare r record;
        begin
          for r in
            select c.table_name, c.column_name
            from information_schema.columns c
            join information_schema.table_constraints tc
              on tc.table_name = c.table_name and tc.constraint_type = 'PRIMARY KEY'
            join information_schema.key_column_usage k
              on k.constraint_name = tc.constraint_name and k.column_name = c.column_name
            where c.table_schema = 'public'
              and c.data_type = 'uuid'
              and c.column_default is null
              and c.table_name not in ('profiles', 'trainees', 'trainers')  -- ids mirror auth.users
          loop
            execute format('alter table public.%I alter column %I set default gen_random_uuid()',
                           r.table_name, r.column_name);
          end loop;
        end $$;
        """
    )


def downgrade() -> None:
    # defaults are harmless; no-op downgrade by design
    pass
