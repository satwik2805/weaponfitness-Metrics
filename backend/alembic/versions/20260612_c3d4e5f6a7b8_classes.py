"""gym_classes + class_bookings — group class scheduling & booking.

Revision ID: c3d4e5f6a7b8
Revises: b7c8d9e0f1a2
"""
from alembic import op
import sqlalchemy as sa
import app.db.types

revision = 'c3d4e5f6a7b8'
down_revision = 'b7c8d9e0f1a2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'gym_classes',
        sa.Column('id', app.db.types.GUID(), nullable=False),
        sa.Column('branch_id', app.db.types.GUID(), nullable=False),
        sa.Column('trainer_id', app.db.types.GUID(), nullable=True),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('weekday', sa.SmallInteger(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('capacity', sa.Integer(), nullable=False, server_default='20'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['trainer_id'], ['trainers.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gym_classes_branch', 'gym_classes', ['branch_id'])

    from sqlalchemy.dialects import postgresql
    booking_status = postgresql.ENUM('Booked', 'Cancelled', 'Attended', name='booking_status_enum', create_type=False)
    booking_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'class_bookings',
        sa.Column('id', app.db.types.GUID(), nullable=False),
        sa.Column('class_id', app.db.types.GUID(), nullable=False),
        sa.Column('trainee_id', app.db.types.GUID(), nullable=False),
        sa.Column('class_date', sa.Date(), nullable=False),
        sa.Column('status', booking_status, nullable=False, server_default='Booked'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['class_id'], ['gym_classes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['trainee_id'], ['trainees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('class_id', 'trainee_id', 'class_date', name='uq_booking_member_instance'),
    )
    op.create_index('ix_class_bookings_class_date', 'class_bookings', ['class_id', 'class_date'])
    op.create_index('ix_class_bookings_trainee', 'class_bookings', ['trainee_id'])


def downgrade() -> None:
    op.drop_index('ix_class_bookings_trainee', table_name='class_bookings')
    op.drop_index('ix_class_bookings_class_date', table_name='class_bookings')
    op.drop_table('class_bookings')
    sa.Enum(name='booking_status_enum').drop(op.get_bind(), checkfirst=True)
    op.drop_index('ix_gym_classes_branch', table_name='gym_classes')
    op.drop_table('gym_classes')
