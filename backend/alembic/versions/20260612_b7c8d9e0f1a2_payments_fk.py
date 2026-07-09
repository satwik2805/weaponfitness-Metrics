"""payments.profile_id FK -> profiles.id (RESTRICT).

Payments are financial records: they must always point at a real profile and
must never be silently orphaned by a profile delete (audit: AdminDashboard
delete orphaned payments). RESTRICT makes that impossible at the DB level.

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
"""
from alembic import op

revision = 'b7c8d9e0f1a2'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_foreign_key(
        'payments_profile_id_fkey', 'payments', 'profiles',
        ['profile_id'], ['id'], ondelete='RESTRICT',
    )
    op.create_index('ix_payments_profile', 'payments', ['profile_id'])
    op.create_index('ix_payments_created_at', 'payments', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_payments_created_at', table_name='payments')
    op.drop_index('ix_payments_profile', table_name='payments')
    op.drop_constraint('payments_profile_id_fkey', 'payments', type_='foreignkey')
