"""Calendar aggregation (Day 12).

Read-only aggregation of existing deadlines — assignment + quiz due dates,
scoped by role:
- student: assignments from enrolled courses
- faculty: assignments from courses they teach
- admin: all assignments in the date range

No schema changes. No event creation. No recurrence.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user
from core.database import get_db
from models.tables import (
    Assignment,
    AssignmentType,
    Course,
    Enrollment,
    QuizAttempt,
    Submission,
    User,
    UserRole,
)


router = APIRouter(prefix="/calendar", tags=["calendar"])


EventType = Literal["assignment", "quiz"]
EventStatus = Literal["pending", "submitted", "graded", "overdue"]


class CalendarEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: EventType
    title: str
    course_id: int
    course_title: str
    due_date: datetime
    status: EventStatus


def _to_utc_range(from_: date, to: date) -> tuple[datetime, datetime]:
    start = datetime.combine(from_, time.min, tzinfo=timezone.utc)
    end = datetime.combine(to, time.max, tzinfo=timezone.utc)
    return start, end


def _student_status(
    assignment: Assignment,
    *,
    submission: Submission | None,
    attempt: QuizAttempt | None,
    now: datetime,
) -> EventStatus:
    if assignment.type == AssignmentType.quiz:
        if attempt and attempt.submitted_at is not None:
            return "graded"
        if assignment.due_date < now:
            return "overdue"
        return "pending"

    # File assignment
    if submission is not None:
        if submission.marks is not None:
            return "graded"
        return "submitted"
    if assignment.due_date < now:
        return "overdue"
    return "pending"


def _faculty_or_admin_status(
    assignment: Assignment, *, now: datetime
) -> EventStatus:
    if assignment.due_date < now:
        return "overdue"
    return "pending"


@router.get("", response_model=list[CalendarEvent])
async def list_events(
    from_: date = Query(..., alias="from"),
    to: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CalendarEvent]:
    if to < from_:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="`to` must be on or after `from`",
        )
    if (to - from_).days > 90:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Range cannot exceed 90 days",
        )

    start, end = _to_utc_range(from_, to)
    now = datetime.now(timezone.utc)

    stmt = (
        select(Assignment, Course)
        .join(Course, Course.id == Assignment.course_id)
        .where(Assignment.due_date >= start, Assignment.due_date <= end)
        .order_by(Assignment.due_date.asc())
    )

    if user.role == UserRole.student:
        stmt = stmt.join(
            Enrollment, Enrollment.course_id == Course.id
        ).where(Enrollment.student_id == user.id)
    elif user.role == UserRole.faculty:
        stmt = stmt.where(Course.faculty_id == user.id)

    result = await db.execute(stmt)
    rows = result.all()
    assignments = [a for a, _ in rows]
    course_by_id = {c.id: c for _, c in rows}

    submissions_by_aid: dict[int, Submission] = {}
    attempts_by_aid: dict[int, QuizAttempt] = {}
    if user.role == UserRole.student and assignments:
        aids = [a.id for a in assignments]
        sr = await db.execute(
            select(Submission).where(
                Submission.student_id == user.id,
                Submission.assignment_id.in_(aids),
            )
        )
        submissions_by_aid = {s.assignment_id: s for s in sr.scalars().all()}
        ar = await db.execute(
            select(QuizAttempt).where(
                QuizAttempt.student_id == user.id,
                QuizAttempt.assignment_id.in_(aids),
            )
        )
        attempts_by_aid = {at.assignment_id: at for at in ar.scalars().all()}

    events: list[CalendarEvent] = []
    for a in assignments:
        course = course_by_id.get(a.course_id)
        if course is None:
            continue
        event_type: EventType = (
            "quiz" if a.type == AssignmentType.quiz else "assignment"
        )
        event_id = f"{event_type}:{a.id}"
        if user.role == UserRole.student:
            ev_status = _student_status(
                a,
                submission=submissions_by_aid.get(a.id),
                attempt=attempts_by_aid.get(a.id),
                now=now,
            )
        else:
            ev_status = _faculty_or_admin_status(a, now=now)

        events.append(
            CalendarEvent(
                id=event_id,
                type=event_type,
                title=a.title,
                course_id=a.course_id,
                course_title=course.title,
                due_date=a.due_date,
                status=ev_status,
            )
        )

    return events
