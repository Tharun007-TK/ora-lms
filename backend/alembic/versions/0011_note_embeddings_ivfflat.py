"""note_embeddings_ivfflat — add ivfflat cosine index on note_embeddings.embedding

Without a pgvector index, ORDER BY embedding <=> $1 is a sequential scan
over every row in note_embeddings (filtered only by the WHERE Note.course_id
= ... join). Acceptable for tens of notes; degrades linearly past that.

ivfflat with vector_cosine_ops + lists = 100 is the sane default for the
~10k-row scale this project targets. Tune lists later (REINDEX) once real
data lands. Build a list of ~sqrt(N) for very large tables; lists = 100 is
fine for N up to ~100k.

Notes:
- The query planner needs stats to choose the index, so ANALYZE the table
  after creation.
- This migration uses plain CREATE INDEX (transactional). For production
  scale, prefer CREATE INDEX CONCURRENTLY run manually outside Alembic.

Revision ID: 0011_note_embeddings_ivfflat
Revises: 0010_hf_embedding_dims
Create Date: 2026-05-06
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "0011_note_embeddings_ivfflat"
down_revision: Union[str, None] = "0010_hf_embedding_dims"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_note_embeddings_embedding_cosine "
        "ON note_embeddings USING ivfflat (embedding vector_cosine_ops) "
        "WITH (lists = 100)"
    )
    op.execute("ANALYZE note_embeddings")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_note_embeddings_embedding_cosine")
