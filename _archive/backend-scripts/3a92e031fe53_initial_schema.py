"""initial schema

Revision ID: 3a92e031fe53
Revises:
Create Date: 2026-01-17
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "3a92e031fe53"
down_revision: Union[str, Sequence[str], None] = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # =========================
    # PROFILES (NO branch FK YET)
    # =========================
    op.create_table(
        "profiles",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("full_name", sa.Text()),
        sa.Column("phone", sa.Text()),
        sa.Column("profile_image", sa.Text()),
        sa.Column(
            "role",
            sa.Enum(
                "Admin",
                "Owner",
                "Receptionist",
                "Trainer",
                "Trainee",
                name="userroleenum",
            ),
            nullable=False,
        ),
        sa.Column("branch_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("last_login", sa.DateTime(timezone=True)),
        sa.Column(
            "profile_updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )

    # =========================
    # BRANCHES (FK  profiles)
    # =========================
    op.create_table(
        "branches",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("branch_name", sa.Text(), nullable=False),
        sa.Column("address", sa.Text()),
        sa.Column("contact_number", sa.Text()),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("allow_trainer_renewal", sa.Boolean()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["profiles.id"], ondelete="RESTRICT"
        ),
    )

    #  ADD branch FK AFTER both tables exist
    op.create_foreign_key(
        "fk_profiles_branch_id",
        source_table="profiles",
        referent_table="branches",
        local_cols=["branch_id"],
        remote_cols=["id"],
        ondelete="SET NULL",
    )

    # =========================
    # DIET LIBRARY
    # =========================
    op.create_table(
        "diet_library",
        sa.Column("diet_library_id", sa.UUID(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_by", sa.UUID()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["created_by"], ["profiles.id"], ondelete="SET NULL"),
    )

    # =========================
    # MEMBERSHIP PLANS
    # =========================
    op.create_table(
        "membership_plans",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("branch_id", sa.UUID()),
        sa.Column("plan_name", sa.Text(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2)),
        sa.Column("duration_months", sa.Integer()),
        sa.Column("description", sa.Text()),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"], ondelete="CASCADE"),
    )

    # =========================
    # TRAINERS
    # =========================
    op.create_table(
        "trainers",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("experience_years", sa.Integer()),
        sa.Column("rating_avg", sa.Numeric(3, 2)),
        sa.Column("bio", sa.Text()),
        sa.ForeignKeyConstraint(["id"], ["profiles.id"], ondelete="CASCADE"),
    )

    # =========================
    # TRAINEES
    # =========================
    op.create_table(
        "trainees",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("trainer_id", sa.UUID()),
        sa.Column("bmi", sa.Numeric(4, 1)),
        sa.Column("weight", sa.Numeric(5, 2)),
        sa.Column("height", sa.Numeric(5, 2)),
        sa.Column("plan_active_status", sa.Boolean()),
        sa.Column("last_absent_email_sent", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["id"], ["profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["trainer_id"], ["trainers.id"], ondelete="SET NULL"),
    )


def downgrade() -> None:
    # DROP FK FIRST
    op.drop_constraint("fk_profiles_branch_id", "profiles", type_="foreignkey")

    op.drop_table("trainees")
    op.drop_table("trainers")
    op.drop_table("membership_plans")
    op.drop_table("diet_library")
    op.drop_table("branches")
    op.drop_table("profiles")
