"""trainee_plans — the membership-assignment link that was always missing.

The old DB had a script-created `trainee_plan` table that never existed in the
models (audit WF-043); every membership/expiry feature silently broke. This
makes it canonical: one row per purchased membership term.

Revision ID: a1b2c3d4e5f6
Revises: 16af5a98d4f8
Create Date: 2026-06-12
"""
from alembic import op
import sqlalchemy as sa
import app.db.types

revision = 'a1b2c3d4e5f6'
down_revision = '16af5a98d4f8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'trainee_plans',
        sa.Column('id', app.db.types.GUID(), nullable=False),
        sa.Column('trainee_id', app.db.types.GUID(), nullable=False),
        sa.Column('plan_id', app.db.types.GUID(), nullable=False),
        sa.Column('started_at', sa.Date(), nullable=False),
        sa.Column('expires_at', sa.Date(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['trainee_id'], ['trainees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plan_id'], ['membership_plans.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_trainee_plans_trainee', 'trainee_plans', ['trainee_id'])
    op.create_index('ix_trainee_plans_expiry', 'trainee_plans', ['expires_at'])
    # one active plan per member at a time
    op.create_index(
        'uq_trainee_plans_one_active', 'trainee_plans', ['trainee_id'],
        unique=True, postgresql_where=sa.text('is_active'),
    )


def downgrade() -> None:
    op.drop_index('uq_trainee_plans_one_active', table_name='trainee_plans')
    op.drop_index('ix_trainee_plans_expiry', table_name='trainee_plans')
    op.drop_index('ix_trainee_plans_trainee', table_name='trainee_plans')
    op.drop_table('trainee_plans')
