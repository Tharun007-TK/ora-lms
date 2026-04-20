"""quiz assignments (Day 11) — MCQ quizzes on assignments

Revision ID: 0004_quiz_assignments
Revises: 0003_email_role_domain
Create Date: 2026-04-20
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_quiz_assignments"
down_revision: Union[str, None] = "0003_email_role_domain"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    assignment_type = sa.Enum("file", "quiz", name="assignment_type")
    assignment_type.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "assignments",
        sa.Column(
            "type",
            assignment_type,
            nullable=False,
            server_default="file",
        ),
    )

    op.create_table(
        "quiz_questions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "assignment_id",
            sa.Integer,
            sa.ForeignKey("assignments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("question_text", sa.Text, nullable=False),
        sa.Column("position", sa.Integer, nullable=False, server_default="0"),
        sa.Column("points", sa.Integer, nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_quiz_questions_assignment_id",
        "quiz_questions",
        ["assignment_id"],
    )

    op.create_table(
        "quiz_options",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "question_id",
            sa.Integer,
            sa.ForeignKey("quiz_questions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("option_text", sa.Text, nullable=False),
        sa.Column(
            "is_correct",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("position", sa.Integer, nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_quiz_options_question_id",
        "quiz_options",
        ["question_id"],
    )

    op.create_table(
        "quiz_attempts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "assignment_id",
            sa.Integer,
            sa.ForeignKey("assignments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True)),
        sa.Column("score", sa.Integer),
        sa.Column("max_score", sa.Integer),
        sa.UniqueConstraint(
            "assignment_id", "student_id", name="uq_quiz_attempt_assignment_student"
        ),
    )
    op.create_index(
        "ix_quiz_attempts_assignment_id",
        "quiz_attempts",
        ["assignment_id"],
    )
    op.create_index(
        "ix_quiz_attempts_student_id",
        "quiz_attempts",
        ["student_id"],
    )

    op.create_table(
        "quiz_answers",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "attempt_id",
            sa.Integer,
            sa.ForeignKey("quiz_attempts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "question_id",
            sa.Integer,
            sa.ForeignKey("quiz_questions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "selected_option_id",
            sa.Integer,
            sa.ForeignKey("quiz_options.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "is_correct",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index(
        "ix_quiz_answers_attempt_id",
        "quiz_answers",
        ["attempt_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_quiz_answers_attempt_id", table_name="quiz_answers")
    op.drop_table("quiz_answers")
    op.drop_index("ix_quiz_attempts_student_id", table_name="quiz_attempts")
    op.drop_index("ix_quiz_attempts_assignment_id", table_name="quiz_attempts")
    op.drop_table("quiz_attempts")
    op.drop_index("ix_quiz_options_question_id", table_name="quiz_options")
    op.drop_table("quiz_options")
    op.drop_index("ix_quiz_questions_assignment_id", table_name="quiz_questions")
    op.drop_table("quiz_questions")
    op.drop_column("assignments", "type")
    sa.Enum(name="assignment_type").drop(op.get_bind(), checkfirst=True)
