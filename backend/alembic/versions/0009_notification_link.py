"""notification_link — add nullable link column for click-through routing

Revision ID: 0009_notification_link
Revises: 0008_rewards
Create Date: 2026-04-27
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0009_notification_link"
down_revision: Union[str, None] = "0008_rewards"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notifications",
        sa.Column("link", sa.String(length=512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notifications", "link")
