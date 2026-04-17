"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-17

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    user_role = sa.Enum("admin", "faculty", "student", name="user_role")
    user_role.create(op.get_bind(), checkfirst=True)

    difficulty = sa.Enum("easy", "medium", "hard", name="problem_difficulty")
    difficulty.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "departments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("code", sa.String(20), nullable=False, unique=True),
        sa.Column("description", sa.Text),
    )
    op.create_index("ix_departments_code", "departments", ["code"])

    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column(
            "department_id",
            sa.Integer,
            sa.ForeignKey("departments.id", ondelete="SET NULL"),
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_department_id", "users", ["department_id"])

    op.create_table(
        "courses",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("code", sa.String(40), nullable=False, unique=True),
        sa.Column("description", sa.Text),
        sa.Column(
            "department_id",
            sa.Integer,
            sa.ForeignKey("departments.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "faculty_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column("semester", sa.String(40)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_courses_code", "courses", ["code"])
    op.create_index("ix_courses_department_id", "courses", ["department_id"])
    op.create_index("ix_courses_faculty_id", "courses", ["faculty_id"])

    op.create_table(
        "enrollments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "student_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "course_id",
            sa.Integer,
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "enrolled_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("student_id", "course_id", name="uq_enrollment_student_course"),
    )
    op.create_index("ix_enrollments_student_id", "enrollments", ["student_id"])
    op.create_index("ix_enrollments_course_id", "enrollments", ["course_id"])

    op.create_table(
        "notes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "course_id",
            sa.Integer,
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text),
        sa.Column("file_url", sa.String(1024)),
        sa.Column(
            "ai_generated",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_by",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_notes_course_id", "notes", ["course_id"])

    op.create_table(
        "note_embeddings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "note_id",
            sa.Integer,
            sa.ForeignKey("notes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chunk_text", sa.Text, nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),
    )
    op.create_index("ix_note_embeddings_note_id", "note_embeddings", ["note_id"])

    op.create_table(
        "assignments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "course_id",
            sa.Integer,
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "max_marks", sa.Integer, nullable=False, server_default=sa.text("100")
        ),
        sa.Column(
            "created_by",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_assignments_course_id", "assignments", ["course_id"])

    op.create_table(
        "submissions",
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
        sa.Column("file_url", sa.String(1024)),
        sa.Column("marks", sa.Integer),
        sa.Column("feedback", sa.Text),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("graded_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint(
            "assignment_id", "student_id", name="uq_submission_assign_student"
        ),
    )
    op.create_index("ix_submissions_assignment_id", "submissions", ["assignment_id"])
    op.create_index("ix_submissions_student_id", "submissions", ["student_id"])

    op.create_table(
        "library_books",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("author", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100)),
        sa.Column("file_url", sa.String(1024)),
        sa.Column("cover_url", sa.String(1024)),
        sa.Column(
            "uploaded_by",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_library_books_title", "library_books", ["title"])
    op.create_index("ix_library_books_category", "library_books", ["category"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text),
        sa.Column(
            "read", sa.Boolean, nullable=False, server_default=sa.text("false")
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_read", "notifications", ["read"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])

    op.create_table(
        "college_info",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("about", sa.Text),
        sa.Column("vision", sa.Text),
        sa.Column("mission", sa.Text),
        sa.Column("established_year", sa.Integer),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "faculty_profiles",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("designation", sa.String(200)),
        sa.Column("qualifications", sa.Text),
        sa.Column("achievements", sa.Text),
        sa.Column("photo_url", sa.String(1024)),
        sa.Column(
            "department_id",
            sa.Integer,
            sa.ForeignKey("departments.id", ondelete="SET NULL"),
        ),
    )
    op.create_index("ix_faculty_profiles_department_id", "faculty_profiles", ["department_id"])

    op.create_table(
        "judge_problems",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("difficulty", difficulty, nullable=False),
        sa.Column("examples", sa.Text),
        sa.Column("constraints", sa.Text),
        sa.Column(
            "created_by",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_judge_problems_difficulty", "judge_problems", ["difficulty"])

    op.create_table(
        "judge_submissions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "problem_id",
            sa.Integer,
            sa.ForeignKey("judge_problems.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("language_id", sa.Integer, nullable=False),
        sa.Column("source_code", sa.Text, nullable=False),
        sa.Column(
            "status", sa.String(50), nullable=False, server_default="Pending"
        ),
        sa.Column("stdout", sa.Text),
        sa.Column("stderr", sa.Text),
        sa.Column("time_ms", sa.Integer),
        sa.Column("memory_kb", sa.Integer),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_judge_submissions_problem_id", "judge_submissions", ["problem_id"])
    op.create_index("ix_judge_submissions_student_id", "judge_submissions", ["student_id"])

    op.create_table(
        "coding_testcases",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "problem_id",
            sa.Integer,
            sa.ForeignKey("judge_problems.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("input", sa.Text, nullable=False),
        sa.Column("expected_output", sa.Text, nullable=False),
        sa.Column(
            "is_hidden", sa.Boolean, nullable=False, server_default=sa.text("false")
        ),
    )
    op.create_index("ix_coding_testcases_problem_id", "coding_testcases", ["problem_id"])


def downgrade() -> None:
    op.drop_table("coding_testcases")
    op.drop_table("judge_submissions")
    op.drop_table("judge_problems")
    op.drop_table("faculty_profiles")
    op.drop_table("college_info")
    op.drop_table("notifications")
    op.drop_table("library_books")
    op.drop_table("submissions")
    op.drop_table("assignments")
    op.drop_table("note_embeddings")
    op.drop_table("notes")
    op.drop_table("enrollments")
    op.drop_table("courses")
    op.drop_table("users")
    op.drop_table("departments")
    sa.Enum(name="problem_difficulty").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="user_role").drop(op.get_bind(), checkfirst=True)
