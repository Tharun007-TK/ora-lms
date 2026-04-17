from __future__ import annotations

from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
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
    Course,
    Enrollment,
    Notification,
    Submission,
    User,
    UserRole,
)
from schemas.requests import (
    AssignmentCreate,
    AssignmentOut,
    AssignmentUpdate,
    GradeSubmissionRequest,
    MessageResponse,
    SubmissionOut,
)
from services import notification_service, storage_service


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
        submitted=submission is not None if submission is not None else None,
        submission_id=submission.id if submission else None,
        marks=submission.marks if submission else None,
    )


def _serialize_submission(
    s: Submission, *, student_name: str | None = None
) -> SubmissionOut:
    return SubmissionOut(
        id=s.id,
        assignment_id=s.assignment_id,
        student_id=s.student_id,
        student_name=student_name,
        file_url=storage_service.resolve_url(s.file_url),
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
    if user.role == UserRole.student and assignments:
        sr = await db.execute(
            select(Submission).where(
                Submission.student_id == user.id,
                Submission.assignment_id.in_([a.id for a in assignments]),
            )
        )
        submissions_by_aid = {s.assignment_id: s for s in sr.scalars().all()}

    return [
        _serialize_assignment(a, submission=submissions_by_aid.get(a.id))
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
    if user.role == UserRole.student:
        sr = await db.execute(
            select(Submission).where(
                Submission.assignment_id == a.id,
                Submission.student_id == user.id,
            )
        )
        submission = sr.scalar_one_or_none()
    return _serialize_assignment(a, submission=submission)


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
    return _serialize_submission(submission, student_name=user.name)


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
        _serialize_submission(s, student_name=s.student.name if s.student else None)
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
    )
    db.add(grade_notif)

    await db.commit()
    await db.refresh(submission)
    await db.refresh(grade_notif)
    await notification_service.publish_one(grade_notif)
    return _serialize_submission(
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
    return [_serialize_submission(s, student_name=user.name) for s in result.scalars().all()]
