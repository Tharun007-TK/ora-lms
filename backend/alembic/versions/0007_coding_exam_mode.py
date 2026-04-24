"""coding exam mode — duration, tab switch tracking, submission metrics

Revision ID: 0007_coding_exam_mode
Revises: 0006_calendar_events
Create Date: 2026-04-24
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0007_coding_exam_mode"
down_revision: Union[str, None] = "0006_calendar_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "coding_assessments",
        sa.Column("duration_minutes", sa.Integer, nullable=True),
    )
    op.add_column(
        "coding_submissions",
        sa.Column(
            "tab_switches",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "coding_submissions",
        sa.Column(
            "auto_submitted",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "coding_submissions",
        sa.Column("passed_count", sa.Integer, nullable=True),
    )
    op.add_column(
        "coding_submissions",
        sa.Column("total_count", sa.Integer, nullable=True),
    )
    op.add_column(
        "coding_submissions",
        sa.Column("time_ms", sa.Integer, nullable=True),
    )
    op.add_column(
        "coding_submissions",
        sa.Column("memory_kb", sa.Integer, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("coding_submissions", "memory_kb")
    op.drop_column("coding_submissions", "time_ms")
    op.drop_column("coding_submissions", "total_count")
    op.drop_column("coding_submissions", "passed_count")
    op.drop_column("coding_submissions", "auto_submitted")
    op.drop_column("coding_submissions", "tab_switches")
    op.drop_column("coding_assessments", "duration_minutes")
