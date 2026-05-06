from __future__ import annotations

import csv
import io
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.auth import (
    get_current_user,
    require_faculty_or_admin,
    require_student,
)
from core.config import settings
from core.database import get_db
from models.tables import (
    Assignment,
    AssignmentType,
    Course,
    Enrollment,
    Notification,
    QuizAnswer,
    QuizAttempt,
    QuizOption,
    QuizQuestion,
    Submission,
    User,
    UserRole,
)
from schemas.requests import (
    AssignmentCreate,
    AssignmentOut,
    AssignmentStatsOut,
    AssignmentUpdate,
    GradeSubmissionRequest,
    MessageResponse,
    QuizAttemptAnswerOut,
    QuizAttemptResultOut,
    QuizAttemptStartOut,
    QuizAttemptSummaryOut,
    QuizOptionFacultyOut,
    QuizOptionStudentOut,
    QuizQuestionCreate,
    QuizQuestionFacultyOut,
    QuizQuestionStudentOut,
    QuizQuestionUpdate,
    QuizSubmitBody,
    SubmissionOut,
)
from services import notification_service, quiz_service, storage_service
from services.docx_quiz_parser import (
    DocxParseError,
    parse_docx_quiz,
    parse_pptx_quiz,
)


def _csv_response(filename: str, rows: list[list]) -> StreamingResponse:
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\n")
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


def _safe_filename_part(value: str) -> str:
    cleaned = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in value)
    return cleaned[:60] or "report"


router = APIRouter(tags=["assignments"])


# ---------- Helpers ----------


async def _get_course_or_404(db: AsyncSession, course_id: int) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


async def _get_assignment_or_404(db: AsyncSession, assignment_id: int) -> Assignment:
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    a = result.scalar_one_or_none()
    if a is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return a


async def _ensure_enrolled(
    db: AsyncSession, course_id: int, student_id: int
) -> None:
    er = await db.execute(
        select(Enrollment.id).where(
            Enrollment.course_id == course_id,
            Enrollment.student_id == student_id,
        )
    )
    if er.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=403, detail="You are not enrolled in this course"
        )


async def _ensure_course_access(
    db: AsyncSession, course: Course, user: User
) -> None:
    if user.role == UserRole.admin:
        return
    if user.role == UserRole.faculty:
        if course.faculty_id != user.id:
            raise HTTPException(status_code=403, detail="Not your course")
        return
    await _ensure_enrolled(db, course.id, user.id)


def _serialize_assignment(
    a: Assignment,
    *,
    submission: Submission | None = None,
    attempt: QuizAttempt | None = None,
) -> AssignmentOut:
    return AssignmentOut(
        id=a.id,
        course_id=a.course_id,
        title=a.title,
        description=a.description,
        due_date=a.due_date,
        max_marks=a.max_marks,
        created_by=a.created_by,
        created_at=a.created_at,
        type=a.type,
        submitted=(submission is not None) if submission is not None else (
            True if attempt and attempt.submitted_at else None
        ),
        submission_id=submission.id if submission else None,
        marks=submission.marks if submission else None,
        attempt_id=attempt.id if attempt else None,
        score=attempt.score if attempt else None,
        max_score=attempt.max_score if attempt else None,
    )


async def _serialize_submission(
    s: Submission, *, student_name: str | None = None
) -> SubmissionOut:
    return SubmissionOut(
        id=s.id,
        assignment_id=s.assignment_id,
        student_id=s.student_id,
        student_name=student_name,
        file_url=await storage_service.resolve_url_async(s.file_url),
        marks=s.marks,
        feedback=s.feedback,
        submitted_at=s.submitted_at,
        graded_at=s.graded_at,
    )


# ---------- Assignment endpoints (scoped to a course) ----------


@router.get(
    "/courses/{course_id}/assignments", response_model=list[AssignmentOut]
)
async def list_assignments(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[AssignmentOut]:
    course = await _get_course_or_404(db, course_id)
    await _ensure_course_access(db, course, user)

    result = await db.execute(
        select(Assignment)
        .where(Assignment.course_id == course_id)
        .order_by(Assignment.due_date.asc())
    )
    assignments = result.scalars().all()

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
        attempts_by_aid = {a.assignment_id: a for a in ar.scalars().all()}

    return [
        _serialize_assignment(
            a,
            submission=submissions_by_aid.get(a.id),
            attempt=attempts_by_aid.get(a.id),
        )
        for a in assignments
    ]


@router.post(
    "/courses/{course_id}/assignments",
    response_model=AssignmentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_assignment(
    course_id: int,
    payload: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> AssignmentOut:
    course = await _get_course_or_404(db, course_id)
    if user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    assignment = Assignment(
        course_id=course_id,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        max_marks=payload.max_marks,
        created_by=user.id,
        type=payload.type,
    )
    db.add(assignment)
    await db.flush()

    # Notify enrolled students
    enrolled = await db.execute(
        select(Enrollment.student_id).where(Enrollment.course_id == course_id)
    )
    created_notifs: list[Notification] = []
    for (student_id,) in enrolled.all():
        n = Notification(
            user_id=student_id,
            title=f"New assignment: {assignment.title}",
            body=(
                f"Due {assignment.due_date.isoformat()} · "
                f"max {assignment.max_marks} marks"
            ),
            link=f"/student/courses/{course_id}/assignments",
        )
        db.add(n)
        created_notifs.append(n)

    await db.commit()
    await db.refresh(assignment)
    for n in created_notifs:
        await db.refresh(n)
        await notification_service.publish_one(n)
    return _serialize_assignment(assignment)


_DOCX_CONTENT_TYPES = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/octet-stream",  # some browsers send this
}
_DOCX_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post(
    "/courses/{course_id}/assignments/quiz/import",
    response_model=AssignmentOut,
    status_code=status.HTTP_201_CREATED,
)
async def import_quiz_from_docx(
    course_id: int,
    due_date: datetime = Form(...),
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    description: str | None = Form(default=None),
    max_marks: int | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> AssignmentOut:
    """Parse an uploaded .docx or .pptx file and create a full quiz
    assignment in one step — questions, options, and correct answers
    extracted automatically. See ``ml_sample_quiz.docx`` for the expected
    layout."""
    course = await _get_course_or_404(db, course_id)
    if user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    filename = (file.filename or "").lower()
    if filename.endswith(".docx"):
        kind = "docx"
    elif filename.endswith(".pptx"):
        kind = "pptx"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .docx and .pptx files are supported",
        )
    if file.content_type and file.content_type not in _DOCX_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unexpected content type: {file.content_type}",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(data) > _DOCX_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 5 MB limit",
        )

    try:
        parsed = parse_pptx_quiz(data) if kind == "pptx" else parse_docx_quiz(data)
    except DocxParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not parsed.questions:
        raise HTTPException(
            status_code=400,
            detail="No valid questions were parsed from the document",
        )

    total_points = sum(q.points for q in parsed.questions)
    resolved_title = (
        title.strip()
        if title and title.strip()
        else (parsed.title or "Imported Quiz")
    )
    resolved_max = max_marks if max_marks is not None else total_points
    if resolved_max < 1:
        resolved_max = total_points

    assignment = Assignment(
        course_id=course_id,
        title=resolved_title,
        description=description,
        due_date=due_date,
        max_marks=resolved_max,
        created_by=user.id,
        type=AssignmentType.quiz,
    )
    db.add(assignment)
    await db.flush()

    for q_idx, q in enumerate(parsed.questions):
        question = QuizQuestion(
            assignment_id=assignment.id,
            question_text=q.text,
            position=q_idx,
            points=q.points,
        )
        db.add(question)
        await db.flush()
        for o_idx, opt_text in enumerate(q.options):
            db.add(
                QuizOption(
                    question_id=question.id,
                    option_text=opt_text,
                    is_correct=o_idx in q.correct_indexes,
                    position=o_idx,
                )
            )

    enrolled = await db.execute(
        select(Enrollment.student_id).where(Enrollment.course_id == course_id)
    )
    created_notifs: list[Notification] = []
    for (student_id,) in enrolled.all():
        n = Notification(
            user_id=student_id,
            title=f"New quiz: {assignment.title}",
            body=(
                f"{len(parsed.questions)} question(s) · "
                f"due {assignment.due_date.isoformat()} · "
                f"max {assignment.max_marks} marks"
            ),
            link=(
                f"/student/courses/{course_id}/assignments/{assignment.id}/attempt"
            ),
        )
        db.add(n)
        created_notifs.append(n)

    await db.commit()
    await db.refresh(assignment)
    for n in created_notifs:
        await db.refresh(n)
        await notification_service.publish_one(n)
    return _serialize_assignment(assignment)


@router.get(
    "/assignments/{assignment_id}", response_model=AssignmentOut
)
async def get_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AssignmentOut:
    a = await _get_assignment_or_404(db, assignment_id)
    course = await _get_course_or_404(db, a.course_id)
    await _ensure_course_access(db, course, user)

    submission = None
    attempt = None
    if user.role == UserRole.student:
        sr = await db.execute(
            select(Submission).where(
                Submission.assignment_id == a.id,
                Submission.student_id == user.id,
            )
        )
        submission = sr.scalar_one_or_none()
        ar = await db.execute(
            select(QuizAttempt).where(
                QuizAttempt.assignment_id == a.id,
                QuizAttempt.student_id == user.id,
            )
        )
        attempt = ar.scalar_one_or_none()
    return _serialize_assignment(a, submission=submission, attempt=attempt)


@router.patch(
    "/assignments/{assignment_id}", response_model=AssignmentOut
)
async def update_assignment(
    assignment_id: int,
    payload: AssignmentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> AssignmentOut:
    a = await _get_assignment_or_404(db, assignment_id)
    course = await _get_course_or_404(db, a.course_id)
    if user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    await db.commit()
    await db.refresh(a)
    return _serialize_assignment(a)


@router.delete(
    "/assignments/{assignment_id}", response_model=MessageResponse
)
async def delete_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> MessageResponse:
    a = await _get_assignment_or_404(db, assignment_id)
    course = await _get_course_or_404(db, a.course_id)
    if user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")
    await db.delete(a)
    await db.commit()
    return MessageResponse(detail="Assignment deleted")


# ---------- Submission endpoints ----------


@router.post(
    "/assignments/{assignment_id}/submit",
    response_model=SubmissionOut,
    status_code=status.HTTP_201_CREATED,
)
async def submit_assignment(
    assignment_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
) -> SubmissionOut:
    a = await _get_assignment_or_404(db, assignment_id)
    await _ensure_enrolled(db, a.course_id, user.id)

    stored = await storage_service.upload_file(
        file,
        bucket=settings.SUPABASE_BUCKET_SUBMISSIONS,
        prefix=f"assignment-{assignment_id}/student-{user.id}",
    )

    existing = await db.execute(
        select(Submission).where(
            Submission.assignment_id == assignment_id,
            Submission.student_id == user.id,
        )
    )
    submission = existing.scalar_one_or_none()

    if submission is not None:
        # Re-submission — clear grading metadata
        submission.file_url = stored.path
        submission.submitted_at = datetime.now(timezone.utc)
        submission.marks = None
        submission.feedback = None
        submission.graded_at = None
    else:
        submission = Submission(
            assignment_id=assignment_id,
            student_id=user.id,
            file_url=stored.path,
        )
        db.add(submission)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Submission already exists")
    await db.refresh(submission)
    return await _serialize_submission(submission, student_name=user.name)


@router.get(
    "/assignments/{assignment_id}/submissions",
    response_model=list[SubmissionOut],
)
async def list_submissions(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> list[SubmissionOut]:
    a = await _get_assignment_or_404(db, assignment_id)
    course = await _get_course_or_404(db, a.course_id)
    if user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.student))
        .where(Submission.assignment_id == assignment_id)
        .order_by(Submission.submitted_at.desc())
    )
    items = result.scalars().unique().all()
    return [
        await _serialize_submission(s, student_name=s.student.name if s.student else None)
        for s in items
    ]


@router.post(
    "/submissions/{submission_id}/grade", response_model=SubmissionOut
)
async def grade_submission(
    submission_id: int,
    payload: GradeSubmissionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> SubmissionOut:
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.student))
        .where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    assignment = await _get_assignment_or_404(db, submission.assignment_id)
    course = await _get_course_or_404(db, assignment.course_id)
    if user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    if payload.marks > assignment.max_marks:
        raise HTTPException(
            status_code=400,
            detail=f"marks exceeds max_marks ({assignment.max_marks})",
        )

    submission.marks = payload.marks
    submission.feedback = payload.feedback
    submission.graded_at = datetime.now(timezone.utc)

    grade_notif = Notification(
        user_id=submission.student_id,
        title=f"Graded: {assignment.title}",
        body=(
            f"You scored {submission.marks}/{assignment.max_marks}"
            + (f" · {payload.feedback}" if payload.feedback else "")
        ),
        link=f"/student/courses/{assignment.course_id}/assignments",
    )
    db.add(grade_notif)

    await db.commit()
    await db.refresh(submission)
    await db.refresh(grade_notif)
    await notification_service.publish_one(grade_notif)
    return await _serialize_submission(
        submission, student_name=submission.student.name if submission.student else None
    )


@router.get("/submissions/mine", response_model=list[SubmissionOut])
async def list_my_submissions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
) -> list[SubmissionOut]:
    result = await db.execute(
        select(Submission)
        .where(Submission.student_id == user.id)
        .order_by(Submission.submitted_at.desc())
    )
    return [await _serialize_submission(s, student_name=user.name) for s in result.scalars().all()]


@router.get("/my-assignments", response_model=list[AssignmentOut])
async def list_mine_faculty(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> list[AssignmentOut]:
    """All file + quiz assignments across courses the faculty teaches.
    Admin sees every assignment."""
    stmt = select(Assignment).join(Course, Course.id == Assignment.course_id)
    if user.role != UserRole.admin:
        stmt = stmt.where(Course.faculty_id == user.id)
    stmt = stmt.order_by(Assignment.due_date.asc())
    result = await db.execute(stmt)
    return [_serialize_assignment(a) for a in result.scalars().all()]


# ---------- Quiz (Day 11) ----------


async def _get_quiz_assignment_or_404(
    db: AsyncSession, assignment_id: int
) -> Assignment:
    a = await _get_assignment_or_404(db, assignment_id)
    if a.type != AssignmentType.quiz:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This assignment is not a quiz",
        )
    return a


async def _ensure_faculty_owns(
    db: AsyncSession, assignment: Assignment, user: User
) -> None:
    if user.role == UserRole.admin:
        return
    course = await _get_course_or_404(db, assignment.course_id)
    if course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")


async def _any_attempts_started(
    db: AsyncSession, assignment_id: int
) -> bool:
    r = await db.execute(
        select(QuizAttempt.id).where(
            QuizAttempt.assignment_id == assignment_id
        ).limit(1)
    )
    return r.scalar_one_or_none() is not None


def _serialize_question_faculty(q: QuizQuestion) -> QuizQuestionFacultyOut:
    return QuizQuestionFacultyOut(
        id=q.id,
        question_text=q.question_text,
        position=q.position,
        points=q.points,
        options=[
            QuizOptionFacultyOut(
                id=o.id,
                option_text=o.option_text,
                is_correct=o.is_correct,
                position=o.position,
            )
            for o in sorted(q.options, key=lambda x: x.position)
        ],
    )


def _serialize_question_student(q: QuizQuestion) -> QuizQuestionStudentOut:
    return QuizQuestionStudentOut(
        id=q.id,
        question_text=q.question_text,
        position=q.position,
        points=q.points,
        options=[
            QuizOptionStudentOut(
                id=o.id,
                option_text=o.option_text,
                position=o.position,
            )
            for o in sorted(q.options, key=lambda x: x.position)
        ],
    )


async def _load_questions(
    db: AsyncSession, assignment_id: int
) -> list[QuizQuestion]:
    r = await db.execute(
        select(QuizQuestion)
        .options(selectinload(QuizQuestion.options))
        .where(QuizQuestion.assignment_id == assignment_id)
        .order_by(QuizQuestion.position)
    )
    return list(r.scalars().unique().all())


@router.get(
    "/assignments/{assignment_id}/quiz/questions",
    response_model=list[QuizQuestionFacultyOut],
)
async def list_quiz_questions(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> list[QuizQuestionFacultyOut]:
    a = await _get_quiz_assignment_or_404(db, assignment_id)
    await _ensure_faculty_owns(db, a, user)
    questions = await _load_questions(db, assignment_id)
    return [_serialize_question_faculty(q) for q in questions]


@router.post(
    "/assignments/{assignment_id}/quiz/questions",
    response_model=QuizQuestionFacultyOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_quiz_question(
    assignment_id: int,
    payload: QuizQuestionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> QuizQuestionFacultyOut:
    a = await _get_quiz_assignment_or_404(db, assignment_id)
    await _ensure_faculty_owns(db, a, user)

    if await _any_attempts_started(db, assignment_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot edit quiz after a student has started an attempt",
        )

    if not any(o.is_correct for o in payload.options):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one option must be marked correct",
        )

    question = QuizQuestion(
        assignment_id=assignment_id,
        question_text=payload.question_text,
        position=payload.position,
        points=payload.points,
    )
    db.add(question)
    await db.flush()

    for idx, opt in enumerate(payload.options):
        db.add(
            QuizOption(
                question_id=question.id,
                option_text=opt.option_text,
                is_correct=opt.is_correct,
                position=idx,
            )
        )
    await db.commit()

    reloaded = await db.execute(
        select(QuizQuestion)
        .options(selectinload(QuizQuestion.options))
        .where(QuizQuestion.id == question.id)
    )
    return _serialize_question_faculty(reloaded.scalar_one())


@router.patch(
    "/assignments/{assignment_id}/quiz/questions/{question_id}",
    response_model=QuizQuestionFacultyOut,
)
async def update_quiz_question(
    assignment_id: int,
    question_id: int,
    payload: QuizQuestionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> QuizQuestionFacultyOut:
    a = await _get_quiz_assignment_or_404(db, assignment_id)
    await _ensure_faculty_owns(db, a, user)

    if await _any_attempts_started(db, assignment_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot edit quiz after a student has started an attempt",
        )

    r = await db.execute(
        select(QuizQuestion)
        .options(selectinload(QuizQuestion.options))
        .where(
            QuizQuestion.id == question_id,
            QuizQuestion.assignment_id == assignment_id,
        )
    )
    question = r.scalar_one_or_none()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    data = payload.model_dump(exclude_unset=True)
    if "question_text" in data:
        question.question_text = data["question_text"]
    if "position" in data:
        question.position = data["position"]
    if "points" in data:
        question.points = data["points"]

    if "options" in data and data["options"] is not None:
        new_options = payload.options or []
        if not any(o.is_correct for o in new_options):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one option must be marked correct",
            )
        for existing in list(question.options):
            await db.delete(existing)
        await db.flush()
        for idx, opt in enumerate(new_options):
            db.add(
                QuizOption(
                    question_id=question.id,
                    option_text=opt.option_text,
                    is_correct=opt.is_correct,
                    position=idx,
                )
            )

    await db.commit()

    reloaded = await db.execute(
        select(QuizQuestion)
        .options(selectinload(QuizQuestion.options))
        .where(QuizQuestion.id == question.id)
    )
    return _serialize_question_faculty(reloaded.scalar_one())


@router.delete(
    "/assignments/{assignment_id}/quiz/questions/{question_id}",
    response_model=MessageResponse,
)
async def delete_quiz_question(
    assignment_id: int,
    question_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> MessageResponse:
    a = await _get_quiz_assignment_or_404(db, assignment_id)
    await _ensure_faculty_owns(db, a, user)

    if await _any_attempts_started(db, assignment_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot edit quiz after a student has started an attempt",
        )

    r = await db.execute(
        select(QuizQuestion).where(
            QuizQuestion.id == question_id,
            QuizQuestion.assignment_id == assignment_id,
        )
    )
    question = r.scalar_one_or_none()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    await db.delete(question)
    await db.commit()
    return MessageResponse(detail="Question deleted")


@router.post(
    "/assignments/{assignment_id}/quiz/attempt",
    response_model=QuizAttemptStartOut,
)
async def start_quiz_attempt(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
) -> QuizAttemptStartOut:
    a = await _get_quiz_assignment_or_404(db, assignment_id)
    await _ensure_enrolled(db, a.course_id, user.id)

    r = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.assignment_id == assignment_id,
            QuizAttempt.student_id == user.id,
        )
    )
    attempt = r.scalar_one_or_none()

    questions = await _load_questions(db, assignment_id)
    max_score = sum(q.points for q in questions)

    if attempt is None:
        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quiz has no questions yet",
            )
        attempt = QuizAttempt(
            assignment_id=assignment_id,
            student_id=user.id,
            max_score=max_score,
        )
        db.add(attempt)
        await db.commit()
        await db.refresh(attempt)

    correct_count: int | None = None
    answers: list[QuizAttemptAnswerOut] | None = None
    if attempt.submitted_at is not None:
        # Build the per-question review block so a returning student sees
        # the same correct/incorrect markers they saw on submit. Correct
        # options are safe to expose here because the attempt is closed.
        ans_rows = (
            await db.execute(
                select(
                    QuizAnswer.question_id,
                    QuizAnswer.selected_option_id,
                    QuizAnswer.is_correct,
                ).where(QuizAnswer.attempt_id == attempt.id)
            )
        ).all()
        selected_by_q: dict[int, list[int]] = {}
        is_correct_by_q: dict[int, bool] = {}
        for qid, opt_id, is_c in ans_rows:
            selected_by_q.setdefault(qid, []).append(opt_id)
            is_correct_by_q[qid] = bool(is_c)

        answers = []
        correct_count = 0
        for q in questions:
            correct_ids = sorted(o.id for o in q.options if o.is_correct)
            sel_ids = sorted(selected_by_q.get(q.id, []))
            is_c = is_correct_by_q.get(q.id, False)
            if is_c:
                correct_count += 1
            answers.append(
                QuizAttemptAnswerOut(
                    question_id=q.id,
                    selected_option_ids=sel_ids,
                    correct_option_ids=correct_ids,
                    is_correct=is_c,
                    points_earned=q.points if is_c else 0,
                    points_max=q.points,
                )
            )

    return QuizAttemptStartOut(
        attempt_id=attempt.id,
        assignment_id=assignment_id,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        max_score=attempt.max_score or max_score,
        score=attempt.score,
        correct_count=correct_count,
        questions=[_serialize_question_student(q) for q in questions],
        answers=answers,
    )


@router.post(
    "/assignments/{assignment_id}/quiz/attempt/{attempt_id}/submit",
    response_model=QuizAttemptResultOut,
)
async def submit_quiz_attempt(
    assignment_id: int,
    attempt_id: int,
    payload: QuizSubmitBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
) -> QuizAttemptResultOut:
    a = await _get_quiz_assignment_or_404(db, assignment_id)
    await _ensure_enrolled(db, a.course_id, user.id)

    r = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.id == attempt_id,
            QuizAttempt.assignment_id == assignment_id,
            QuizAttempt.student_id == user.id,
        )
    )
    attempt = r.scalar_one_or_none()
    if attempt is None:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.submitted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attempt already submitted",
        )

    questions = await _load_questions(db, assignment_id)
    selections: dict[int, set[int]] = {
        ans.question_id: set(ans.option_ids) for ans in payload.answers
    }

    score, max_score, graded = quiz_service.grade_attempt(questions, selections)

    # Persist answers and attempt score.
    for g in graded:
        for opt_id in g.selected_option_ids:
            db.add(
                QuizAnswer(
                    attempt_id=attempt.id,
                    question_id=g.question_id,
                    selected_option_id=opt_id,
                    is_correct=g.is_correct,
                )
            )
    attempt.submitted_at = datetime.now(timezone.utc)
    attempt.score = score
    attempt.max_score = max_score
    await db.commit()
    await db.refresh(attempt)

    return QuizAttemptResultOut(
        attempt_id=attempt.id,
        assignment_id=assignment_id,
        student_id=user.id,
        score=score,
        max_score=max_score,
        submitted_at=attempt.submitted_at,
        answers=[
            QuizAttemptAnswerOut(
                question_id=g.question_id,
                selected_option_ids=g.selected_option_ids,
                correct_option_ids=g.correct_option_ids,
                is_correct=g.is_correct,
                points_earned=g.points_earned,
                points_max=g.points_max,
            )
            for g in graded
        ],
    )


@router.get(
    "/assignments/{assignment_id}/quiz/attempts",
    response_model=list[QuizAttemptSummaryOut],
)
async def list_quiz_attempts(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> list[QuizAttemptSummaryOut]:
    a = await _get_quiz_assignment_or_404(db, assignment_id)
    await _ensure_faculty_owns(db, a, user)

    r = await db.execute(
        select(QuizAttempt)
        .options(selectinload(QuizAttempt.assignment))
        .where(QuizAttempt.assignment_id == assignment_id)
        .order_by(QuizAttempt.started_at.desc())
    )
    attempts = list(r.scalars().unique().all())
    if not attempts:
        return []

    student_ids = [at.student_id for at in attempts]
    ur = await db.execute(select(User).where(User.id.in_(student_ids)))
    names = {u.id: u.name for u in ur.scalars().all()}

    return [
        QuizAttemptSummaryOut(
            id=at.id,
            assignment_id=at.assignment_id,
            student_id=at.student_id,
            student_name=names.get(at.student_id),
            started_at=at.started_at,
            submitted_at=at.submitted_at,
            score=at.score,
            max_score=at.max_score,
        )
        for at in attempts
    ]


@router.get(
    "/courses/{course_id}/assignments/stats",
    response_model=list[AssignmentStatsOut],
)
async def assignment_stats(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> list[AssignmentStatsOut]:
    course = await _get_course_or_404(db, course_id)
    if user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    enrolled_r = await db.execute(
        select(func.count(Enrollment.id)).where(Enrollment.course_id == course_id)
    )
    total_enrolled: int = enrolled_r.scalar() or 0

    asgn_r = await db.execute(
        select(Assignment).where(Assignment.course_id == course_id)
    )
    all_assignments = list(asgn_r.scalars().all())
    if not all_assignments:
        return []

    file_aids = [a.id for a in all_assignments if a.type == AssignmentType.file]
    quiz_aids = [a.id for a in all_assignments if a.type == AssignmentType.quiz]

    file_counts: dict[int, int] = {}
    if file_aids:
        fc_r = await db.execute(
            select(Submission.assignment_id, func.count(Submission.id))
            .where(Submission.assignment_id.in_(file_aids))
            .group_by(Submission.assignment_id)
        )
        file_counts = {aid: cnt for aid, cnt in fc_r.all()}

    quiz_counts: dict[int, int] = {}
    if quiz_aids:
        qc_r = await db.execute(
            select(QuizAttempt.assignment_id, func.count(QuizAttempt.id))
            .where(
                QuizAttempt.assignment_id.in_(quiz_aids),
                QuizAttempt.submitted_at.isnot(None),
            )
            .group_by(QuizAttempt.assignment_id)
        )
        quiz_counts = {aid: cnt for aid, cnt in qc_r.all()}

    return [
        AssignmentStatsOut(
            assignment_id=a.id,
            completed=file_counts.get(a.id, 0) if a.type == AssignmentType.file
            else quiz_counts.get(a.id, 0),
            total_enrolled=total_enrolled,
        )
        for a in all_assignments
    ]


# ---------- CSV report exports (faculty / admin) ----------


@router.get("/assignments/{assignment_id}/submissions/export.csv")
async def export_file_submissions_csv(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> StreamingResponse:
    a = await _get_assignment_or_404(db, assignment_id)
    if a.type != AssignmentType.file:
        raise HTTPException(
            status_code=400, detail="Use the quiz export for quiz assignments"
        )
    course = await _get_course_or_404(db, a.course_id)
    if user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    roster_res = await db.execute(
        select(User)
        .join(Enrollment, Enrollment.student_id == User.id)
        .where(Enrollment.course_id == a.course_id, User.role == UserRole.student)
        .order_by(User.name)
    )
    roster: list[User] = list(roster_res.scalars().all())

    sub_res = await db.execute(
        select(Submission).where(Submission.assignment_id == assignment_id)
    )
    sub_by_student: dict[int, Submission] = {
        s.student_id: s for s in sub_res.scalars().all()
    }

    rows: list[list] = [
        [
            "student_id",
            "student_name",
            "student_email",
            "status",
            "submitted_at",
            "file_url",
            "marks",
            "max_marks",
            "feedback",
            "graded_at",
        ]
    ]
    for s in roster:
        sub = sub_by_student.get(s.id)
        if sub is None:
            status_text = "missing"
        elif sub.graded_at is not None:
            status_text = "graded"
        else:
            status_text = "submitted"
        rows.append(
            [
                s.id,
                s.name,
                s.email,
                status_text,
                _iso(sub.submitted_at) if sub else "",
                storage_service.resolve_url(sub.file_url) if sub and sub.file_url else "",
                sub.marks if sub and sub.marks is not None else "",
                a.max_marks,
                (sub.feedback or "") if sub else "",
                _iso(sub.graded_at) if sub else "",
            ]
        )

    filename = f"submissions_{assignment_id}_{_safe_filename_part(a.title)}.csv"
    return _csv_response(filename, rows)


@router.get("/assignments/{assignment_id}/quiz/attempts/export.csv")
async def export_quiz_attempts_csv(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> StreamingResponse:
    a = await _get_quiz_assignment_or_404(db, assignment_id)
    await _ensure_faculty_owns(db, a, user)

    q_res = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.assignment_id == assignment_id)
        .order_by(QuizQuestion.position.asc(), QuizQuestion.id.asc())
    )
    questions: list[QuizQuestion] = list(q_res.scalars().all())

    roster_res = await db.execute(
        select(User)
        .join(Enrollment, Enrollment.student_id == User.id)
        .where(Enrollment.course_id == a.course_id, User.role == UserRole.student)
        .order_by(User.name)
    )
    roster: list[User] = list(roster_res.scalars().all())

    at_res = await db.execute(
        select(QuizAttempt).where(QuizAttempt.assignment_id == assignment_id)
    )
    attempts: list[QuizAttempt] = list(at_res.scalars().all())
    at_by_student: dict[int, QuizAttempt] = {at.student_id: at for at in attempts}

    answers_by_attempt: dict[int, dict[int, bool]] = {}
    if attempts:
        ans_res = await db.execute(
            select(QuizAnswer).where(
                QuizAnswer.attempt_id.in_([at.id for at in attempts])
            )
        )
        for ans in ans_res.scalars().all():
            answers_by_attempt.setdefault(ans.attempt_id, {})[ans.question_id] = ans.is_correct

    headers = [
        "student_id",
        "student_name",
        "student_email",
        "status",
        "started_at",
        "submitted_at",
        "score",
        "max_score",
        "percentage",
    ]
    for idx, _q in enumerate(questions, start=1):
        headers.append(f"q{idx}_correct")

    rows: list[list] = [headers]
    for s in roster:
        at = at_by_student.get(s.id)
        if at is None:
            status_text = "not_attempted"
        elif at.submitted_at is None:
            status_text = "in_progress"
        else:
            status_text = "submitted"

        score = at.score if at and at.score is not None else ""
        max_score = at.max_score if at and at.max_score is not None else ""
        if isinstance(score, int) and isinstance(max_score, int) and max_score > 0:
            pct = round(score / max_score * 100, 2)
        else:
            pct = ""

        row: list = [
            s.id,
            s.name,
            s.email,
            status_text,
            _iso(at.started_at) if at else "",
            _iso(at.submitted_at) if at else "",
            score,
            max_score,
            pct,
        ]
        ans_map = answers_by_attempt.get(at.id, {}) if at else {}
        for q in questions:
            if at is None or at.submitted_at is None:
                row.append("")
            else:
                val = ans_map.get(q.id)
                row.append(1 if val is True else 0)
        rows.append(row)

    filename = f"quiz_{assignment_id}_{_safe_filename_part(a.title)}.csv"
    return _csv_response(filename, rows)
