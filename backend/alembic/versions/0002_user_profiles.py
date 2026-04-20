"""user_profiles (Day 9) — rich profiles for all roles; drop faculty_profiles

Revision ID: 0002_user_profiles
Revises: 0001_initial
Create Date: 2026-04-20
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0002_user_profiles"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("avatar_url", sa.String(1024)),
        sa.Column("cover_url", sa.String(1024)),
        sa.Column("bio", sa.Text),
        sa.Column("headline", sa.String(200)),
        sa.Column(
            "links",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "skills",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("designation", sa.String(200)),
        sa.Column("qualifications", sa.Text),
        sa.Column("achievements", sa.Text),
        sa.Column(
            "is_public",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
            onupdate=sa.text("now()"),
        ),
    )

    # Migrate existing faculty_profiles rows into user_profiles. Set
    # is_public=true so the existing public faculty pages keep rendering.
    op.execute(
        """
        INSERT INTO user_profiles (
            user_id,
            avatar_url,
            designation,
            qualifications,
            achievements,
            is_public,
            links,
            skills
        )
        SELECT
            fp.user_id,
            fp.photo_url,
            fp.designation,
            fp.qualifications,
            fp.achievements,
            true,
            '[]'::jsonb,
            '[]'::jsonb
        FROM faculty_profiles fp
        ON CONFLICT (user_id) DO NOTHING
        """
    )

    # Backfill empty rows for any user without a profile, so every user has
    # a 1:1 profile row post-migration.
    op.execute(
        """
        INSERT INTO user_profiles (user_id, links, skills)
        SELECT u.id, '[]'::jsonb, '[]'::jsonb
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE p.user_id IS NULL
        """
    )

    # Some bootstrap flows (create_all / stamp) may not have created this
    # index; tolerate its absence so the migration is idempotent.
    op.execute("DROP INDEX IF EXISTS ix_faculty_profiles_department_id")
    op.execute("DROP TABLE IF EXISTS faculty_profiles CASCADE")


def downgrade() -> None:
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
    op.create_index(
        "ix_faculty_profiles_department_id",
        "faculty_profiles",
        ["department_id"],
    )

    # Best-effort restore. department_id is not tracked in user_profiles.
    op.execute(
        """
        INSERT INTO faculty_profiles (
            user_id, designation, qualifications, achievements, photo_url
        )
        SELECT
            p.user_id,
            p.designation,
            p.qualifications,
            p.achievements,
            p.avatar_url
        FROM user_profiles p
        JOIN users u ON u.id = p.user_id
        WHERE u.role = 'faculty'
          AND (
            p.designation IS NOT NULL
            OR p.qualifications IS NOT NULL
            OR p.achievements IS NOT NULL
            OR p.avatar_url IS NOT NULL
          )
        """
    )

    op.drop_table("user_profiles")
