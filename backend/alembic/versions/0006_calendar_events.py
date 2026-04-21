"""calendar_events — user-created events and reminders

Revision ID: 0006_calendar_events
Revises: 0005_coding_assessments
Create Date: 2026-04-21
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0006_calendar_events"
down_revision: Union[str, None] = "0005_coding_assessments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "calendar_events",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("event_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reminder_minutes", sa.Integer, nullable=True),
        sa.Column(
            "reminder_sent",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_calendar_events_user_id", "calendar_events", ["user_id"])
    op.create_index("ix_calendar_events_event_date", "calendar_events", ["event_date"])


def downgrade() -> None:
    op.drop_index("ix_calendar_events_event_date", table_name="calendar_events")
    op.drop_index("ix_calendar_events_user_id", table_name="calendar_events")
    op.drop_table("calendar_events")
