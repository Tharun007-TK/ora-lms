"""coding assessments + practice problems (UPDATE.md)

Revision ID: 0005_coding_assessments
Revises: 0004_quiz_assignments
Create Date: 2026-04-20
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0005_coding_assessments"
down_revision: Union[str, None] = "0004_quiz_assignments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use DO blocks so we can re-run cleanly (Postgres lacks CREATE TYPE IF NOT EXISTS).
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE coding_scoring_mode AS ENUM ('all_or_nothing', 'partial');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE coding_submission_status AS ENUM ('pending', 'running', 'completed', 'error');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE coding_difficulty AS ENUM ('easy', 'medium', 'hard');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    scoring_mode = postgresql.ENUM(
        "all_or_nothing", "partial", name="coding_scoring_mode", create_type=False
    )
    submission_status = postgresql.ENUM(
        "pending",
        "running",
        "completed",
        "error",
        name="coding_submission_status",
        create_type=False,
    )
    coding_difficulty = postgresql.ENUM(
        "easy", "medium", "hard", name="coding_difficulty", create_type=False
    )

    op.create_table(
        "coding_assessments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "course_id",
            sa.Integer,
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "created_by",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column(
            "allowed_languages",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[\"python\"]'::jsonb"),
        ),
        sa.Column(
            "time_limit_seconds", sa.Integer, nullable=False, server_default="2"
        ),
        sa.Column(
            "memory_limit_mb", sa.Integer, nullable=False, server_default="256"
        ),
        sa.Column(
            "max_score", sa.Integer, nullable=False, server_default="100"
        ),
        sa.Column("scoring_mode", scoring_mode, nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "max_attempts", sa.Integer, nullable=False, server_default="3"
        ),
        sa.Column(
            "is_practice",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("points", sa.Integer, nullable=False, server_default="0"),
        sa.Column("difficulty", coding_difficulty, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
            onupdate=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_coding_assessments_course_id",
        "coding_assessments",
        ["course_id"],
    )
    op.create_index(
        "ix_coding_assessments_is_practice",
        "coding_assessments",
        ["is_practice"],
    )
    op.create_index(
        "ix_coding_assessments_difficulty",
        "coding_assessments",
        ["difficulty"],
    )

    op.create_table(
        "coding_test_cases",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "assessment_id",
            sa.Integer,
            sa.ForeignKey("coding_assessments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("input", sa.Text, nullable=False),
        sa.Column("expected_output", sa.Text, nullable=False),
        sa.Column(
            "is_hidden",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("weight", sa.Integer, nullable=False, server_default="1"),
        sa.Column(
            "order_index", sa.Integer, nullable=False, server_default="0"
        ),
    )
    op.create_index(
        "ix_coding_test_cases_assessment_id",
        "coding_test_cases",
        ["assessment_id"],
    )

    op.create_table(
        "coding_submissions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "assessment_id",
            sa.Integer,
            sa.ForeignKey("coding_assessments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("language", sa.String(30), nullable=False),
        sa.Column("source_code", sa.Text, nullable=False),
        sa.Column("score", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", submission_status, nullable=False),
        sa.Column(
            "test_case_results",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_coding_submissions_assessment_id",
        "coding_submissions",
        ["assessment_id"],
    )
    op.create_index(
        "ix_coding_submissions_student_id",
        "coding_submissions",
        ["student_id"],
    )

    op.create_table(
        "practice_progress",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "student_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "assessment_id",
            sa.Integer,
            sa.ForeignKey("coding_assessments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "points_earned", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column(
            "solved_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint(
            "student_id",
            "assessment_id",
            name="uq_practice_progress_student_assessment",
        ),
    )
    op.create_index(
        "ix_practice_progress_student_id",
        "practice_progress",
        ["student_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_practice_progress_student_id", table_name="practice_progress")
    op.drop_table("practice_progress")
    op.drop_index("ix_coding_submissions_student_id", table_name="coding_submissions")
    op.drop_index("ix_coding_submissions_assessment_id", table_name="coding_submissions")
    op.drop_table("coding_submissions")
    op.drop_index("ix_coding_test_cases_assessment_id", table_name="coding_test_cases")
    op.drop_table("coding_test_cases")
    op.drop_index("ix_coding_assessments_difficulty", table_name="coding_assessments")
    op.drop_index("ix_coding_assessments_is_practice", table_name="coding_assessments")
    op.drop_index("ix_coding_assessments_course_id", table_name="coding_assessments")
    op.drop_table("coding_assessments")
    sa.Enum(name="coding_difficulty").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="coding_submission_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="coding_scoring_mode").drop(op.get_bind(), checkfirst=True)
