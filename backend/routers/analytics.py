from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Iterable

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import require_faculty_or_admin
from core.database import get_db
from models.tables import (
    Assignment,
    AssignmentType,
    CodingAssessment,
    CodingSubmission,
    Course,
    Enrollment,
    QuizAnswer,
    QuizAttempt,
    QuizQuestion,
    Submission,
    User,
    UserRole,
)


router = APIRouter(prefix="/analytics", tags=["analytics"])


SUMMARY_HEADERS = [
    "course_id",
    "course_title",
    "type",
    "assessment_id",
    "title",
    "due_date",
    "total_enrolled",
    "completed",
    "completion_rate",
    "avg_score",
    "max_score",
    "top_score",
    "late_count",
    "avg_percentage",
]


def _csv_stream(filename: str, header: list[str], rows: Iterable[list]) -> StreamingResponse:
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\n")
    writer.writerow(header)
    for row in rows:
        writer.writerow(row)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _iso(dt: datetime | None) -> str:
    return dt.isoformat() if dt else ""


def _round(value: float | None, digits: int = 2) -> str:
    if value is None:
        return ""
    return f"{round(value, digits)}"


@router.get("/assessments/summary.csv")
async def assessments_summary_csv(
    course_id: int | None = Query(default=None),
    kind: str | None = Query(default=None, regex="^(file|quiz|coding)$"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> StreamingResponse:
    course_stmt = select(Course)
    if user.role == UserRole.faculty:
        course_stmt = course_stmt.where(Course.faculty_id == user.id)
    if course_id is not None:
        course_stmt = course_stmt.where(Course.id == course_id)
    course_res = await db.execute(course_stmt)
    courses = list(course_res.scalars().all())
    if not courses:
        return _csv_stream("assessment_summary.csv", SUMMARY_HEADERS, [])

    course_ids = [c.id for c in courses]
    course_by_id = {c.id: c for c in courses}

    enroll_res = await db.execute(
        select(Enrollment.course_id, func.count(Enrollment.id))
        .where(Enrollment.course_id.in_(course_ids))
        .group_by(Enrollment.course_id)
    )
    enrolled_by_course: dict[int, int] = {cid: cnt for cid, cnt in enroll_res.all()}

    rows: list[list] = []

    if kind in (None, "file", "quiz"):
        asg_res = await db.execute(
            select(Assignment).where(Assignment.course_id.in_(course_ids))
        )
        assignments_list: list[Assignment] = list(asg_res.scalars().all())

        file_aids = [a.id for a in assignments_list if a.type == AssignmentType.file]
        quiz_aids = [a.id for a in assignments_list if a.type == AssignmentType.quiz]

        sub_by_aid: dict[int, list[Submission]] = {aid: [] for aid in file_aids}
        if file_aids:
            sr = await db.execute(
                select(Submission).where(Submission.assignment_id.in_(file_aids))
            )
            for s in sr.scalars().all():
                sub_by_aid.setdefault(s.assignment_id, []).append(s)

        att_by_aid: dict[int, list[QuizAttempt]] = {aid: [] for aid in quiz_aids}
        if quiz_aids:
            qr = await db.execute(
                select(QuizAttempt).where(QuizAttempt.assignment_id.in_(quiz_aids))
            )
            for at in qr.scalars().all():
                att_by_aid.setdefault(at.assignment_id, []).append(at)

        for a in assignments_list:
            if kind == "file" and a.type != AssignmentType.file:
                continue
            if kind == "quiz" and a.type != AssignmentType.quiz:
                continue

            course = course_by_id.get(a.course_id)
            total_enrolled = enrolled_by_course.get(a.course_id, 0)

            if a.type == AssignmentType.file:
                subs = sub_by_aid.get(a.id, [])
                completed = len(subs)
                graded = [s for s in subs if s.marks is not None]
                avg_score = (
                    sum(s.marks for s in graded) / len(graded) if graded else None
                )
                top_score = max((s.marks for s in graded), default=None)
                late_count = sum(
                    1
                    for s in subs
                    if a.due_date and s.submitted_at and s.submitted_at > a.due_date
                )
                max_score_val = a.max_marks
                avg_pct = (
                    avg_score / max_score_val * 100
                    if avg_score is not None and max_score_val
                    else None
                )
                row_type = "file"
            else:
                attempts = [at for at in att_by_aid.get(a.id, []) if at.submitted_at]
                completed = len(attempts)
                scored = [at for at in attempts if at.score is not None]
                avg_score = (
                    sum(at.score for at in scored) / len(scored) if scored else None
                )
                top_score = max((at.score for at in scored), default=None)
                late_count = sum(
                    1
                    for at in attempts
                    if a.due_date and at.submitted_at and at.submitted_at > a.due_date
                )
                max_score_val = (
                    attempts[0].max_score if attempts and attempts[0].max_score
                    else a.max_marks
                )
                avg_pct = (
                    avg_score / max_score_val * 100
                    if avg_score is not None and max_score_val
                    else None
                )
                row_type = "quiz"

            completion_rate = (
                completed / total_enrolled * 100 if total_enrolled else None
            )
            rows.append(
                [
                    a.course_id,
                    course.title if course else "",
                    row_type,
                    a.id,
                    a.title,
                    _iso(a.due_date),
                    total_enrolled,
                    completed,
                    _round(completion_rate),
                    _round(avg_score),
                    max_score_val,
                    top_score if top_score is not None else "",
                    late_count,
                    _round(avg_pct),
                ]
            )

    if kind in (None, "coding"):
        ca_res = await db.execute(
            select(CodingAssessment).where(
                CodingAssessment.course_id.in_(course_ids),
                CodingAssessment.is_practice.is_(False),
            )
        )
        coding_list: list[CodingAssessment] = list(ca_res.scalars().all())
        ca_ids = [c.id for c in coding_list]

        best_by_pair: dict[tuple[int, int], int] = {}
        if ca_ids:
            cs_res = await db.execute(
                select(
                    CodingSubmission.assessment_id,
                    CodingSubmission.student_id,
                    func.max(CodingSubmission.score),
                )
                .where(CodingSubmission.assessment_id.in_(ca_ids))
                .group_by(
                    CodingSubmission.assessment_id, CodingSubmission.student_id
                )
            )
            for aid, sid, best in cs_res.all():
                best_by_pair[(aid, sid)] = best or 0

        late_lookup: dict[int, int] = {}
        if ca_ids:
            ca_by_id = {c.id: c for c in coding_list}
            late_q = await db.execute(
                select(
                    CodingSubmission.assessment_id,
                    CodingSubmission.submitted_at,
                ).where(CodingSubmission.assessment_id.in_(ca_ids))
            )
            for aid, sub_at in late_q.all():
                ca = ca_by_id.get(aid)
                if ca and ca.due_date and sub_at and sub_at > ca.due_date:
                    late_lookup[aid] = late_lookup.get(aid, 0) + 1

        for ca in coding_list:
            course = course_by_id.get(ca.course_id) if ca.course_id else None
            total_enrolled = (
                enrolled_by_course.get(ca.course_id, 0) if ca.course_id else 0
            )
            best_scores = [
                v for (a_id, _sid), v in best_by_pair.items() if a_id == ca.id
            ]
            completed = len(best_scores)
            avg_score = (
                sum(best_scores) / len(best_scores) if best_scores else None
            )
            top_score = max(best_scores, default=None)
            completion_rate = (
                completed / total_enrolled * 100 if total_enrolled else None
            )
            avg_pct = (
                avg_score / ca.max_score * 100
                if avg_score is not None and ca.max_score
                else None
            )
            rows.append(
                [
                    ca.course_id or "",
                    course.title if course else "",
                    "coding",
                    ca.id,
                    ca.title,
                    _iso(ca.due_date),
                    total_enrolled,
                    completed,
                    _round(completion_rate),
                    _round(avg_score),
                    ca.max_score,
                    top_score if top_score is not None else "",
                    late_lookup.get(ca.id, 0),
                    _round(avg_pct),
                ]
            )

    rows.sort(key=lambda r: (str(r[1]), str(r[2]), str(r[4])))
    return _csv_stream("assessment_summary.csv", SUMMARY_HEADERS, rows)


@router.get("/quiz/{assignment_id}/questions.csv")
async def quiz_question_analysis_csv(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> StreamingResponse:
    a_res = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = a_res.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.type != AssignmentType.quiz:
        raise HTTPException(status_code=400, detail="Assignment is not a quiz")

    if user.role == UserRole.faculty:
        c_res = await db.execute(
            select(Course).where(Course.id == assignment.course_id)
        )
        course = c_res.scalar_one_or_none()
        if course is None or course.faculty_id != user.id:
            raise HTTPException(status_code=403, detail="Not your course")

    q_res = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.assignment_id == assignment_id)
        .order_by(QuizQuestion.position.asc(), QuizQuestion.id.asc())
    )
    questions: list[QuizQuestion] = list(q_res.scalars().all())

    at_res = await db.execute(
        select(QuizAttempt.id).where(
            QuizAttempt.assignment_id == assignment_id,
            QuizAttempt.submitted_at.isnot(None),
        )
    )
    attempt_ids = [aid for (aid,) in at_res.all()]
    total_attempts = len(attempt_ids)

    correct_by_qid: dict[int, int] = {}
    answered_by_qid: dict[int, int] = {}
    if attempt_ids:
        ans_res = await db.execute(
            select(QuizAnswer).where(QuizAnswer.attempt_id.in_(attempt_ids))
        )
        for ans in ans_res.scalars().all():
            answered_by_qid[ans.question_id] = (
                answered_by_qid.get(ans.question_id, 0) + 1
            )
            if ans.is_correct:
                correct_by_qid[ans.question_id] = (
                    correct_by_qid.get(ans.question_id, 0) + 1
                )

    headers = [
        "q_index",
        "question_id",
        "question_text",
        "points",
        "attempts",
        "answered",
        "correct_count",
        "correct_pct",
    ]
    rows: list[list] = []
    for idx, q in enumerate(questions, start=1):
        answered = answered_by_qid.get(q.id, 0)
        correct = correct_by_qid.get(q.id, 0)
        pct = (correct / total_attempts * 100) if total_attempts else None
        rows.append(
            [
                idx,
                q.id,
                q.question_text,
                q.points,
                total_attempts,
                answered,
                correct,
                _round(pct),
            ]
        )

    safe = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in assignment.title)[:60]
    filename = f"quiz_analysis_{assignment_id}_{safe or 'report'}.csv"
    return _csv_stream(filename, headers, rows)
