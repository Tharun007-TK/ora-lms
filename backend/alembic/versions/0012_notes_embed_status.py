"""notes_embed_status — add embed_status enum and retry_count to notes

embed_note() is a fire-and-forget BackgroundTask. Today, when it fails
(rate limit, transient HF/torch error, DB error mid-write), the failure
is only visible in logs — the note is silently un-indexed and there is
no signal for a retry path or for the UI to flag stale RAG.

Add two columns:
  embed_status: enum('pending','embedding','done','failed')
  retry_count : int, default 0

Existing rows are left at the default 'pending' so the next embed cycle
treats them as needing a fresh pass — safer than assuming legacy rows
finished successfully.

Revision ID: 0012_notes_embed_status
Revises: 0011_note_embeddings_ivfflat
Create Date: 2026-05-06
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0012_notes_embed_status"
down_revision: Union[str, None] = "0011_note_embeddings_ivfflat"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_ENUM_NAME = "noteembedstatus"
_ENUM_VALUES = ("pending", "embedding", "done", "failed")


def upgrade() -> None:
    embed_status = sa.Enum(*_ENUM_VALUES, name=_ENUM_NAME)
    embed_status.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "notes",
        sa.Column(
            "embed_status",
            embed_status,
            nullable=False,
            server_default="pending",
        ),
    )
    op.add_column(
        "notes",
        sa.Column(
            "retry_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("notes", "retry_count")
    op.drop_column("notes", "embed_status")
    embed_status = sa.Enum(*_ENUM_VALUES, name=_ENUM_NAME)
    embed_status.drop(op.get_bind(), checkfirst=True)
