"""Rewards — practice stars + code arena badges.

Called from ``routers/coding_assessments.py`` on submit to:
 - compute 0-3 stars for practice progress
 - award new milestone badges for graded assessments

Badge catalog is a fixed dict; persistence lives in ``user_badges``.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.tables import (
    CodingAssessment,
    CodingSubmission,
    CodingSubmissionStatus,
    UserBadge,
)


@dataclass(frozen=True)
class BadgeDef:
    key: str
    label: str
    description: str
    icon: str  # single emoji shown in UI


BADGE_CATALOG: dict[str, BadgeDef] = {
    "first_solve": BadgeDef(
        key="first_solve",
        label="First Solve",
        description="Passed every testcase on a graded assessment.",
        icon="🎯",
    ),
    "perfectionist": BadgeDef(
        key="perfectionist",
        label="Perfectionist",
        description="Full score on 3 different graded assessments.",
        icon="💎",
    ),
    "focused": BadgeDef(
        key="focused",
        label="Focused",
        description="Submitted a graded assessment with zero tab switches.",
        icon="🧘",
    ),
    "speedster": BadgeDef(
        key="speedster",
        label="Speedster",
        description="Full score before half the exam time elapsed.",
        icon="⚡",
    ),
    "arena_veteran": BadgeDef(
        key="arena_veteran",
        label="Arena Veteran",
        description="Completed 5 graded assessments.",
        icon="🏟️",
    ),
}


def compute_stars(
    *,
    results: list[dict],
    passed_count: int,
    total_count: int,
) -> int:
    """0–3 stars based on testcase coverage, LeetCode-style.

    3 = all cases (visible + hidden) pass
    2 = all visible cases pass but at least one hidden failed
    1 = any case passed
    0 = nothing passed
    """
    if total_count <= 0 or passed_count <= 0:
        return 0
    if passed_count >= total_count:
        return 3
    visible = [r for r in results if not r.get("is_hidden")]
    if visible and all(r.get("passed") for r in visible):
        return 2
    return 1


async def award_badges(
    db: AsyncSession,
    *,
    user_id: int,
    keys: Iterable[str],
    assessment_id: int | None,
) -> list[BadgeDef]:
    """Insert badges the user does not already own. Returns newly awarded."""
    keys = [k for k in keys if k in BADGE_CATALOG]
    if not keys:
        return []

    existing_rows = await db.execute(
        select(UserBadge.badge_key).where(
            UserBadge.user_id == user_id,
            UserBadge.badge_key.in_(keys),
        )
    )
    owned = {row[0] for row in existing_rows.all()}
    fresh = [k for k in keys if k not in owned]
    for k in fresh:
        db.add(
            UserBadge(
                user_id=user_id,
                badge_key=k,
                assessment_id=assessment_id,
            )
        )
    return [BADGE_CATALOG[k] for k in fresh]


async def evaluate_graded_submit(
    db: AsyncSession,
    *,
    user_id: int,
    assessment: CodingAssessment,
    score: int,
    max_score: int,
    tab_switches: int,
    passed_count: int,
    total_count: int,
    time_elapsed_seconds: int | None,
) -> list[str]:
    """Return badge keys that this submit qualifies for. Caller persists."""
    earned: list[str] = []
    full_score = max_score > 0 and score >= max_score

    if full_score and total_count > 0 and passed_count >= total_count:
        earned.append("first_solve")

    if tab_switches == 0 and score > 0:
        earned.append("focused")

    if (
        full_score
        and assessment.duration_minutes
        and time_elapsed_seconds is not None
        and time_elapsed_seconds <= (assessment.duration_minutes * 60) / 2
    ):
        earned.append("speedster")

    # Perfectionist — count distinct graded assessments solved at full score,
    # including the current one optimistically.
    if full_score:
        distinct_full_q = await db.execute(
            select(func.count(func.distinct(CodingSubmission.assessment_id)))
            .join(
                CodingAssessment,
                CodingAssessment.id == CodingSubmission.assessment_id,
            )
            .where(
                CodingSubmission.student_id == user_id,
                CodingSubmission.status == CodingSubmissionStatus.completed,
                CodingAssessment.is_practice.is_(False),
                CodingSubmission.score >= CodingAssessment.max_score,
                CodingAssessment.max_score > 0,
            )
        )
        distinct_full = int(distinct_full_q.scalar() or 0)
        if distinct_full + 1 >= 3:
            earned.append("perfectionist")

    distinct_done_q = await db.execute(
        select(func.count(func.distinct(CodingSubmission.assessment_id)))
        .join(
            CodingAssessment,
            CodingAssessment.id == CodingSubmission.assessment_id,
        )
        .where(
            CodingSubmission.student_id == user_id,
            CodingSubmission.status == CodingSubmissionStatus.completed,
            CodingAssessment.is_practice.is_(False),
        )
    )
    distinct_done = int(distinct_done_q.scalar() or 0)
    if distinct_done + 1 >= 5:
        earned.append("arena_veteran")

    return earned


async def list_user_badges(
    db: AsyncSession, *, user_id: int
) -> list[dict]:
    r = await db.execute(
        select(UserBadge)
        .where(UserBadge.user_id == user_id)
        .order_by(UserBadge.earned_at.desc())
    )
    out: list[dict] = []
    for b in r.scalars().all():
        meta = BADGE_CATALOG.get(b.badge_key)
        if meta is None:
            continue
        out.append(
            {
                "key": meta.key,
                "label": meta.label,
                "description": meta.description,
                "icon": meta.icon,
                "earned_at": b.earned_at.isoformat(),
                "assessment_id": b.assessment_id,
            }
        )
    return out
