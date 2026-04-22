from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.auth import (
    get_current_user,
    require_faculty_or_admin,
    require_student,
)
from core.database import get_db
from models.tables import (
    CodingAssessment,
    CodingSubmission,
    CodingSubmissionStatus,
    CodingTestCase,
    Course,
    Enrollment,
    PracticeProgress,
    User,
    UserRole,
)
from schemas.requests import (
    CodingAssessmentBrief,
    CodingAssessmentCreate,
    CodingAssessmentOut,
    CodingAssessmentUpdate,
    CodingLeaderboardEntry,
    CodingRunResult,
    CodingSubmissionOut,
    CodingSubmitBody,
    CodingTestCaseFacultyOut,
    CodingTestCaseStudentOut,
    MessageResponse,
    PracticeStats,
)
from services import judge_service


router = APIRouter(prefix="/coding-assessments", tags=["coding-assessments"])


async def _get_assessment_or_404(
    db: AsyncSession, assessment_id: int, *, load_tcs: bool = False
) -> CodingAssessment:
    stmt = select(CodingAssessment).where(CodingAssessment.id == assessment_id)
    if load_tcs:
        stmt = stmt.options(selectinload(CodingAssessment.test_cases))
    result = await db.execute(stmt)
    a = result.scalar_one_or_none()
    if a is None:
        raise HTTPException(status_code=404, detail="Coding assessment not found")
    return a


async def _faculty_owns_or_403(
    db: AsyncSession, assessment: CodingAssessment, user: User
) -> None:
    if user.role == UserRole.admin:
        return
    if assessment.is_practice:
        if assessment.created_by != user.id:
            raise HTTPException(status_code=403, detail="Not your practice problem")
        return
    if assessment.course_id is None:
        raise HTTPException(status_code=400, detail="Graded assessment missing course")
    course_res = await db.execute(
        select(Course).where(Course.id == assessment.course_id)
    )
    course = course_res.scalar_one_or_none()
    if course is None or course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")


async def _student_can_access(
    db: AsyncSession, assessment: CodingAssessment, user: User
) -> None:
    if assessment.is_practice:
        return
    if assessment.course_id is None:
        raise HTTPException(status_code=400, detail="Graded assessment missing course")
    er = await db.execute(
        select(Enrollment.id).where(
            Enrollment.course_id == assessment.course_id,
            Enrollment.student_id == user.id,
        )
    )
    if er.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")


def _serialize_brief(
    a: CodingAssessment,
    *,
    course: Course | None = None,
    attempts_used: int | None = None,
    best_score: int | None = None,
    solved: bool | None = None,
) -> CodingAssessmentBrief:
    return CodingAssessmentBrief(
        id=a.id,
        course_id=a.course_id,
        course_title=course.title if course else None,
        title=a.title,
        allowed_languages=a.allowed_languages or [],
        max_score=a.max_score,
        scoring_mode=a.scoring_mode,
        due_date=a.due_date,
        max_attempts=a.max_attempts,
        is_practice=a.is_practice,
        points=a.points,
        difficulty=a.difficulty,
        created_at=a.created_at,
        attempts_used=attempts_used,
        best_score=best_score,
        solved=solved,
    )


def _serialize_out_faculty(a: CodingAssessment) -> CodingAssessmentOut:
    return CodingAssessmentOut(
        id=a.id,
        course_id=a.course_id,
        created_by=a.created_by,
        title=a.title,
        description=a.description,
        allowed_languages=a.allowed_languages or [],
        time_limit_seconds=a.time_limit_seconds,
        memory_limit_mb=a.memory_limit_mb,
        max_score=a.max_score,
        scoring_mode=a.scoring_mode,
        due_date=a.due_date,
        max_attempts=a.max_attempts,
        is_practice=a.is_practice,
        points=a.points,
        difficulty=a.difficulty,
        created_at=a.created_at,
        updated_at=a.updated_at,
        test_cases_faculty=[
            CodingTestCaseFacultyOut.model_validate(tc) for tc in a.test_cases
        ],
        test_cases_student=None,
    )


def _serialize_out_student(a: CodingAssessment) -> CodingAssessmentOut:
    visible = [
        CodingTestCaseStudentOut(
            id=tc.id,
            input=None if tc.is_hidden else tc.input,
            expected_output=None if tc.is_hidden else tc.expected_output,
            is_hidden=tc.is_hidden,
            order_index=tc.order_index,
        )
        for tc in a.test_cases
    ]
    return CodingAssessmentOut(
        id=a.id,
        course_id=a.course_id,
        created_by=a.created_by,
        title=a.title,
        description=a.description,
        allowed_languages=a.allowed_languages or [],
        time_limit_seconds=a.time_limit_seconds,
        memory_limit_mb=a.memory_limit_mb,
        max_score=a.max_score,
        scoring_mode=a.scoring_mode,
        due_date=a.due_date,
        max_attempts=a.max_attempts,
        is_practice=a.is_practice,
        points=a.points,
        difficulty=a.difficulty,
        created_at=a.created_at,
        updated_at=a.updated_at,
        test_cases_faculty=None,
        test_cases_student=visible,
    )


def _redact_results_for_student(results: list | None) -> list | None:
    if not results:
        return results
    redacted: list = []
    for r in results:
        if r.get("is_hidden"):
            redacted.append(
                {
                    "test_case_id": r.get("test_case_id"),
                    "passed": r.get("passed"),
                    "is_hidden": True,
                    "time_ms": r.get("time_ms"),
                }
            )
        else:
            redacted.append(r)
    return redacted


@router.post(
    "", response_model=CodingAssessmentOut, status_code=status.HTTP_201_CREATED
)
async def create_assessment(
    body: CodingAssessmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> CodingAssessmentOut:
    if not body.is_practice and body.course_id is not None:
        course_res = await db.execute(select(Course).where(Course.id == body.course_id))
        course = course_res.scalar_one_or_none()
        if course is None:
            raise HTTPException(status_code=404, detail="Course not found")
        if user.role == UserRole.faculty and course.faculty_id != user.id:
            raise HTTPException(status_code=403, detail="Not your course")

    assessment = CodingAssessment(
        course_id=None if body.is_practice else body.course_id,
        created_by=user.id,
        title=body.title,
        description=body.description,
        allowed_languages=body.allowed_languages,
        time_limit_seconds=body.time_limit_seconds,
        memory_limit_mb=body.memory_limit_mb,
        max_score=body.max_score,
        scoring_mode=body.scoring_mode,
        due_date=None if body.is_practice else body.due_date,
        max_attempts=body.max_attempts,
        is_practice=body.is_practice,
        points=body.points if body.is_practice else 0,
        difficulty=body.difficulty if body.is_practice else None,
    )
    db.add(assessment)
    await db.flush()

    for idx, tc in enumerate(body.test_cases):
        db.add(
            CodingTestCase(
                assessment_id=assessment.id,
                input=tc.input,
                expected_output=tc.expected_output,
                is_hidden=tc.is_hidden,
                weight=tc.weight,
                order_index=tc.order_index or idx,
            )
        )

    await db.commit()

    reloaded = await db.execute(
        select(CodingAssessment)
        .options(selectinload(CodingAssessment.test_cases))
        .where(CodingAssessment.id == assessment.id)
    )
    return _serialize_out_faculty(reloaded.scalar_one())


@router.get("/course/{course_id}", response_model=list[CodingAssessmentBrief])
async def list_for_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CodingAssessmentBrief]:
    course_res = await db.execute(select(Course).where(Course.id == course_id))
    course = course_res.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    if user.role == UserRole.student:
        er = await db.execute(
            select(Enrollment.id).where(
                Enrollment.course_id == course_id,
                Enrollment.student_id == user.id,
            )
        )
        if er.scalar_one_or_none() is None:
            raise HTTPException(status_code=403, detail="Not enrolled")
    elif user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    result = await db.execute(
        select(CodingAssessment)
        .where(
            CodingAssessment.course_id == course_id,
            CodingAssessment.is_practice.is_(False),
        )
        .order_by(desc(CodingAssessment.created_at))
    )
    items = list(result.scalars().all())

    attempts_map: dict[int, tuple[int, int | None]] = {}
    if user.role == UserRole.student and items:
        aids = [a.id for a in items]
        ar = await db.execute(
            select(
                CodingSubmission.assessment_id,
                func.count(CodingSubmission.id),
                func.max(CodingSubmission.score),
            )
            .where(
                CodingSubmission.student_id == user.id,
                CodingSubmission.assessment_id.in_(aids),
            )
            .group_by(CodingSubmission.assessment_id)
        )
        for aid, cnt, best in ar.all():
            attempts_map[aid] = (cnt, best)

    return [
        _serialize_brief(
            a,
            course=course,
            attempts_used=attempts_map.get(a.id, (None, None))[0],
            best_score=attempts_map.get(a.id, (None, None))[1],
        )
        for a in items
    ]


@router.get("/practice", response_model=list[CodingAssessmentBrief])
async def list_practice(
    difficulty: str | None = None,
    language: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CodingAssessmentBrief]:
    stmt = select(CodingAssessment).where(CodingAssessment.is_practice.is_(True))
    if difficulty:
        stmt = stmt.where(CodingAssessment.difficulty == difficulty)
    stmt = stmt.order_by(
        CodingAssessment.difficulty.asc(), desc(CodingAssessment.created_at)
    )
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    if language:
        items = [a for a in items if language in (a.allowed_languages or [])]

    progress_map: dict[int, int] = {}
    attempts_map: dict[int, tuple[int, int | None]] = {}
    if user.role == UserRole.student and items:
        aids = [a.id for a in items]
        pr = await db.execute(
            select(PracticeProgress.assessment_id, PracticeProgress.points_earned).where(
                PracticeProgress.student_id == user.id,
                PracticeProgress.assessment_id.in_(aids),
            )
        )
        progress_map = {row[0]: row[1] for row in pr.all()}
        ar = await db.execute(
            select(
                CodingSubmission.assessment_id,
                func.count(CodingSubmission.id),
                func.max(CodingSubmission.score),
            )
            .where(
                CodingSubmission.student_id == user.id,
                CodingSubmission.assessment_id.in_(aids),
            )
            .group_by(CodingSubmission.assessment_id)
        )
        for aid, cnt, best in ar.all():
            attempts_map[aid] = (cnt, best)

    return [
        _serialize_brief(
            a,
            attempts_used=attempts_map.get(a.id, (None, None))[0],
            best_score=attempts_map.get(a.id, (None, None))[1],
            solved=a.id in progress_map,
        )
        for a in items
    ]


@router.get("/practice/stats", response_model=PracticeStats)
async def practice_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
) -> PracticeStats:
    r = await db.execute(
        select(
            func.coalesce(func.sum(PracticeProgress.points_earned), 0),
            func.count(PracticeProgress.id),
        ).where(PracticeProgress.student_id == user.id)
    )
    total, count = r.one()
    return PracticeStats(total_points=int(total or 0), solved_count=int(count or 0))


@router.get("/mine", response_model=list[CodingAssessmentBrief])
async def list_mine(
    is_practice: bool | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> list[CodingAssessmentBrief]:
    stmt = select(CodingAssessment)
    if user.role != UserRole.admin:
        stmt = stmt.where(CodingAssessment.created_by == user.id)
    if is_practice is not None:
        stmt = stmt.where(CodingAssessment.is_practice.is_(is_practice))
    stmt = stmt.order_by(desc(CodingAssessment.created_at))
    result = await db.execute(stmt)
    items = list(result.scalars().all())
    course_ids = {a.course_id for a in items if a.course_id is not None}
    course_map: dict[int, Course] = {}
    if course_ids:
        cr = await db.execute(select(Course).where(Course.id.in_(course_ids)))
        course_map = {c.id: c for c in cr.scalars().all()}
    return [
        _serialize_brief(a, course=course_map.get(a.course_id) if a.course_id else None)
        for a in items
    ]


@router.get("/{assessment_id}", response_model=CodingAssessmentOut)
async def get_assessment(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CodingAssessmentOut:
    a = await _get_assessment_or_404(db, assessment_id, load_tcs=True)
    if user.role in (UserRole.faculty, UserRole.admin):
        return _serialize_out_faculty(a)
    await _student_can_access(db, a, user)
    return _serialize_out_student(a)


@router.patch("/{assessment_id}", response_model=CodingAssessmentOut)
async def update_assessment(
    assessment_id: int,
    body: CodingAssessmentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> CodingAssessmentOut:
    a = await _get_assessment_or_404(db, assessment_id, load_tcs=True)
    await _faculty_owns_or_403(db, a, user)

    data = body.model_dump(exclude_unset=True)
    if "allowed_languages" in data and data["allowed_languages"]:
        from schemas.requests import ALLOWED_CODING_LANGUAGES

        bad = [
            l for l in data["allowed_languages"] if l not in ALLOWED_CODING_LANGUAGES
        ]
        if bad:
            raise HTTPException(
                status_code=400, detail=f"Unsupported languages: {bad}"
            )
    for k, v in data.items():
        setattr(a, k, v)
    await db.commit()
    await db.refresh(a)
    return _serialize_out_faculty(a)


@router.delete("/{assessment_id}", response_model=MessageResponse)
async def delete_assessment(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> MessageResponse:
    a = await _get_assessment_or_404(db, assessment_id)
    await _faculty_owns_or_403(db, a, user)
    await db.delete(a)
    await db.commit()
    return MessageResponse(detail="Coding assessment deleted")


@router.post("/{assessment_id}/run", response_model=CodingRunResult)
async def run_code(
    assessment_id: int,
    body: CodingSubmitBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
) -> CodingRunResult:
    """Compile + execute against visible test cases only. No persist, no points.

    Purpose: let a student check their code before clicking Submit.
    """
    a = await _get_assessment_or_404(db, assessment_id, load_tcs=True)
    await _student_can_access(db, a, user)

    if body.language not in (a.allowed_languages or []):
        raise HTTPException(
            status_code=400,
            detail=f"Language '{body.language}' not allowed for this assessment",
        )

    visible = [tc for tc in a.test_cases if not tc.is_hidden]
    if not visible:
        raise HTTPException(
            status_code=400,
            detail="No visible test cases to run against",
        )

    result = await judge_service.evaluate_submission(
        source_code=body.source_code,
        language=body.language,
        test_cases=visible,
        max_score=len(visible),  # not used in response; just passes through
        scoring_mode=a.scoring_mode.value
        if hasattr(a.scoring_mode, "value")
        else a.scoring_mode,
        time_limit_seconds=a.time_limit_seconds,
    )

    passed = sum(1 for r in result.test_case_results if r.get("passed"))
    return CodingRunResult(
        test_case_results=result.test_case_results,
        passed=passed,
        total=len(visible),
    )


@router.post(
    "/{assessment_id}/submit",
    response_model=CodingSubmissionOut,
    status_code=status.HTTP_201_CREATED,
)
async def submit_code(
    assessment_id: int,
    body: CodingSubmitBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
) -> CodingSubmissionOut:
    a = await _get_assessment_or_404(db, assessment_id, load_tcs=True)
    await _student_can_access(db, a, user)

    if body.language not in (a.allowed_languages or []):
        raise HTTPException(
            status_code=400,
            detail=f"Language '{body.language}' not allowed for this assessment",
        )

    if not a.is_practice:
        cnt_res = await db.execute(
            select(func.count(CodingSubmission.id)).where(
                CodingSubmission.assessment_id == assessment_id,
                CodingSubmission.student_id == user.id,
            )
        )
        used = int(cnt_res.scalar() or 0)
        if used >= a.max_attempts:
            raise HTTPException(
                status_code=409,
                detail=f"Max attempts ({a.max_attempts}) reached",
            )
        if a.due_date and datetime.now(timezone.utc) > a.due_date:
            raise HTTPException(status_code=409, detail="Assessment is past due")

    submission = CodingSubmission(
        assessment_id=assessment_id,
        student_id=user.id,
        language=body.language,
        source_code=body.source_code,
        score=0,
        status=CodingSubmissionStatus.running,
    )
    db.add(submission)
    await db.flush()

    try:
        result = await judge_service.evaluate_submission(
            source_code=body.source_code,
            language=body.language,
            test_cases=a.test_cases,
            max_score=a.max_score,
            scoring_mode=a.scoring_mode.value
            if hasattr(a.scoring_mode, "value")
            else a.scoring_mode,
            time_limit_seconds=a.time_limit_seconds,
        )
        submission.score = result.score
        submission.status = CodingSubmissionStatus.completed
        submission.test_case_results = result.test_case_results
    except HTTPException:
        submission.status = CodingSubmissionStatus.error
        submission.test_case_results = None
        raise
    except Exception as exc:  # noqa: BLE001
        submission.status = CodingSubmissionStatus.error
        submission.test_case_results = [{"error": str(exc)}]

    if a.is_practice and submission.score >= a.max_score and a.max_score > 0:
        existing = await db.execute(
            select(PracticeProgress).where(
                PracticeProgress.student_id == user.id,
                PracticeProgress.assessment_id == a.id,
            )
        )
        if existing.scalar_one_or_none() is None:
            db.add(
                PracticeProgress(
                    student_id=user.id,
                    assessment_id=a.id,
                    points_earned=a.points,
                )
            )

    await db.commit()
    await db.refresh(submission)

    return CodingSubmissionOut(
        id=submission.id,
        assessment_id=submission.assessment_id,
        student_id=submission.student_id,
        student_name=user.name,
        language=submission.language,
        source_code=submission.source_code,
        score=submission.score,
        status=submission.status,
        test_case_results=_redact_results_for_student(submission.test_case_results),
        submitted_at=submission.submitted_at,
    )


@router.get(
    "/{assessment_id}/submissions/me",
    response_model=list[CodingSubmissionOut],
)
async def list_my_submissions(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
) -> list[CodingSubmissionOut]:
    a = await _get_assessment_or_404(db, assessment_id)
    await _student_can_access(db, a, user)
    r = await db.execute(
        select(CodingSubmission)
        .where(
            CodingSubmission.assessment_id == assessment_id,
            CodingSubmission.student_id == user.id,
        )
        .order_by(desc(CodingSubmission.submitted_at))
    )
    items = list(r.scalars().all())
    return [
        CodingSubmissionOut(
            id=s.id,
            assessment_id=s.assessment_id,
            student_id=s.student_id,
            student_name=user.name,
            language=s.language,
            source_code=s.source_code,
            score=s.score,
            status=s.status,
            test_case_results=_redact_results_for_student(s.test_case_results),
            submitted_at=s.submitted_at,
        )
        for s in items
    ]


@router.get(
    "/{assessment_id}/submissions",
    response_model=list[CodingSubmissionOut],
)
async def list_all_submissions(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> list[CodingSubmissionOut]:
    a = await _get_assessment_or_404(db, assessment_id)
    await _faculty_owns_or_403(db, a, user)
    r = await db.execute(
        select(CodingSubmission, User.name)
        .join(User, User.id == CodingSubmission.student_id)
        .where(CodingSubmission.assessment_id == assessment_id)
        .order_by(desc(CodingSubmission.submitted_at))
    )
    rows = r.all()
    return [
        CodingSubmissionOut(
            id=s.id,
            assessment_id=s.assessment_id,
            student_id=s.student_id,
            student_name=name,
            language=s.language,
            source_code=s.source_code,
            score=s.score,
            status=s.status,
            test_case_results=s.test_case_results,
            submitted_at=s.submitted_at,
        )
        for s, name in rows
    ]


@router.get(
    "/{assessment_id}/leaderboard",
    response_model=list[CodingLeaderboardEntry],
)
async def coding_leaderboard(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> list[CodingLeaderboardEntry]:
    a = await _get_assessment_or_404(db, assessment_id)
    await _faculty_owns_or_403(db, a, user)

    r = await db.execute(
        select(
            CodingSubmission.student_id,
            func.max(CodingSubmission.score).label("best_score"),
            func.count(CodingSubmission.id).label("submissions"),
            func.max(CodingSubmission.submitted_at).label("last_submitted_at"),
        )
        .where(CodingSubmission.assessment_id == assessment_id)
        .group_by(CodingSubmission.student_id)
        .order_by(func.max(CodingSubmission.score).desc())
    )
    rows = r.all()
    if not rows:
        return []

    student_ids = [row[0] for row in rows]
    ur = await db.execute(select(User).where(User.id.in_(student_ids)))
    names = {u.id: u.name for u in ur.scalars().all()}

    return [
        CodingLeaderboardEntry(
            rank=i + 1,
            student_id=row[0],
            student_name=names.get(row[0]),
            best_score=row[1] or 0,
            max_score=a.max_score,
            submissions=row[2],
            last_submitted_at=row[3],
        )
        for i, row in enumerate(rows)
    ]
