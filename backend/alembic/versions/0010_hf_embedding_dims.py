"""hf_embedding_dims — switch note_embeddings.embedding from vector(1536) → vector(384)

Replaces OpenAI text-embedding-3-small (1536 dims) with HuggingFace
BAAI/bge-small-en-v1.5 (384 dims) so RAG retrieval works without an OpenAI key.
Existing embedding rows are wiped because the dim change is not value-preserving;
notes themselves are untouched and re-embed on next AI Notes Maker upload.

Revision ID: 0010_hf_embedding_dims
Revises: 0009_notification_link
Create Date: 2026-04-30
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision: str = "0010_hf_embedding_dims"
down_revision: Union[str, None] = "0009_notification_link"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Wipe rows: vector dim change is not value-preserving.
    op.execute("DELETE FROM note_embeddings")
    op.drop_column("note_embeddings", "embedding")
    op.add_column(
        "note_embeddings",
        sa.Column("embedding", Vector(384), nullable=False),
    )


def downgrade() -> None:
    op.execute("DELETE FROM note_embeddings")
    op.drop_column("note_embeddings", "embedding")
    op.add_column(
        "note_embeddings",
        sa.Column("embedding", Vector(1536), nullable=False),
    )
