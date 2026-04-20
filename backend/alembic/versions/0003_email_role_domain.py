"""email_role_domain CHECK constraint (Day 10)

Revision ID: 0003_email_role_domain
Revises: 0002_user_profiles
Create Date: 2026-04-20

IMPORTANT — DO NOT apply this migration until the following audit returns
zero rows:

    SELECT id, email, role FROM users WHERE
      (role = 'student' AND email NOT LIKE '%@mcet.in') OR
      (role IN ('faculty', 'admin') AND email NOT LIKE '%@drmcet.ac.in');

Applying it while mismatched rows exist will fail with a check_violation.
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "0003_email_role_domain"
down_revision: Union[str, None] = "0002_user_profiles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_CHECK_NAME = "email_role_domain"
_CHECK_EXPR = (
    "(role = 'student' AND email LIKE '%@mcet.in') OR "
    "(role IN ('faculty', 'admin') AND email LIKE '%@drmcet.ac.in')"
)


def upgrade() -> None:
    op.create_check_constraint(_CHECK_NAME, "users", _CHECK_EXPR)


def downgrade() -> None:
    op.drop_constraint(_CHECK_NAME, "users", type_="check")
