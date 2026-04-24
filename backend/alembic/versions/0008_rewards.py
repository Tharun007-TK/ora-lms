"""rewards — practice stars + code arena badges

Revision ID: 0008_rewards
Revises: 0007_coding_exam_mode
Create Date: 2026-04-24
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0008_rewards"
down_revision: Union[str, None] = "0007_coding_exam_mode"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "practice_progress",
        sa.Column(
            "stars",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
    )

    op.create_table(
        "user_badges",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("badge_key", sa.String(60), nullable=False),
        sa.Column(
            "assessment_id",
            sa.Integer,
            sa.ForeignKey("coding_assessments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "earned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint(
            "user_id", "badge_key", name="uq_user_badges_user_badge"
        ),
    )
    op.create_index("ix_user_badges_user_id", "user_badges", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_badges_user_id", table_name="user_badges")
    op.drop_table("user_badges")
    op.drop_column("practice_progress", "stars")
