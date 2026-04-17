from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.auth import get_current_user, require_admin
from core.database import get_db
from models.tables import (
    CodingTestcase,
    JudgeProblem,
    JudgeSubmission,
    User,
    UserRole,
)
from schemas.requests import (
    CodingTestcaseOut,
    JudgeProblemBrief,
    JudgeProblemCreate,
    JudgeProblemOut,
    JudgeProblemUpdate,
    JudgeSubmissionOut,
    JudgeSubmitRequest,
    MessageResponse,
)
from services import judge_service, notification_service


router = APIRouter(prefix="/judge", tags=["judge"])


# ---------- Helpers ----------


def _visible_testcases(problem: JudgeProblem) -> list[CodingTestcaseOut]:
    return [
        CodingTestcaseOut.model_validate(tc)
        for tc in problem.testcases
        if not tc.is_hidden
    ]


async def _load_problem(
    db: AsyncSession, problem_id: int, *, with_testcases: bool = True
) -> JudgeProblem:
    stmt = select(JudgeProblem).where(JudgeProblem.id == problem_id)
    if with_testcases:
        stmt = stmt.options(selectinload(JudgeProblem.testcases))
    problem = (await db.execute(stmt)).scalar_one_or_none()
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


# ---------- Problems ----------


@router.get("/problems", response_model=list[JudgeProblemBrief])
async def list_problems(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[JudgeProblemBrief]:
    result = await db.execute(
        select(JudgeProblem).order_by(JudgeProblem.created_at.desc())
    )
    problems = result.scalars().all()

    # Mark solved status per student
    solved_ids: set[int] = set()
    if user.role == UserRole.student:
        sub_rows = await db.execute(
            select(JudgeSubmission.problem_id)
            .where(
                JudgeSubmission.student_id == user.id,
                JudgeSubmission.status == "AC",
            )
            .group_by(JudgeSubmission.problem_id)
        )
        solved_ids = {int(r[0]) for r in sub_rows.all()}

    out: list[JudgeProblemBrief] = []
    for p in problems:
        item = JudgeProblemBrief.model_validate(p)
        item.solved = p.id in solved_ids if user.role == UserRole.student else None
        out.append(item)
    return out


@router.get("/problems/{problem_id}", response_model=JudgeProblemOut)
async def get_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JudgeProblemOut:
    problem = await _load_problem(db, problem_id)
    out = JudgeProblemOut(
        id=problem.id,
        title=problem.title,
        description=problem.description,
        difficulty=problem.difficulty,
        examples=problem.examples,
        constraints=problem.constraints,
        created_by=problem.created_by,
        created_at=problem.created_at,
        testcases=(
            [CodingTestcaseOut.model_validate(tc) for tc in problem.testcases]
            if user.role == UserRole.admin
            else _visible_testcases(problem)
        ),
    )
    return out


@router.post(
    "/problems",
    response_model=JudgeProblemOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_problem(
    body: JudgeProblemCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> JudgeProblemOut:
    problem = JudgeProblem(
        title=body.title,
        description=body.description,
        difficulty=body.difficulty,
        examples=body.examples,
        constraints=body.constraints,
        created_by=admin.id,
    )
    db.add(problem)
    await db.flush()

    for tc in body.testcases:
        db.add(
            CodingTestcase(
                problem_id=problem.id,
                input=tc.input,
                expected_output=tc.expected_output,
                is_hidden=tc.is_hidden,
            )
        )
    await db.commit()

    reloaded = await _load_problem(db, problem.id)
    return JudgeProblemOut(
        id=reloaded.id,
        title=reloaded.title,
        description=reloaded.description,
        difficulty=reloaded.difficulty,
        examples=reloaded.examples,
        constraints=reloaded.constraints,
        created_by=reloaded.created_by,
        created_at=reloaded.created_at,
        testcases=[
            CodingTestcaseOut.model_validate(tc) for tc in reloaded.testcases
        ],
    )


@router.patch("/problems/{problem_id}", response_model=JudgeProblemOut)
async def update_problem(
    problem_id: int,
    body: JudgeProblemUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> JudgeProblemOut:
    problem = await _load_problem(db, problem_id)
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(problem, k, v)
    await db.commit()
    await db.refresh(problem)

    reloaded = await _load_problem(db, problem_id)
    return JudgeProblemOut(
        id=reloaded.id,
        title=reloaded.title,
        description=reloaded.description,
        difficulty=reloaded.difficulty,
        examples=reloaded.examples,
        constraints=reloaded.constraints,
        created_by=reloaded.created_by,
        created_at=reloaded.created_at,
        testcases=[
            CodingTestcaseOut.model_validate(tc) for tc in reloaded.testcases
        ],
    )


@router.delete("/problems/{problem_id}", response_model=MessageResponse)
async def delete_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> MessageResponse:
    problem = await _load_problem(db, problem_id)
    await db.delete(problem)
    await db.commit()
    return MessageResponse(detail="Problem deleted")


# ---------- Submissions ----------


@router.post(
    "/problems/{problem_id}/submit",
    response_model=JudgeSubmissionOut,
    status_code=status.HTTP_201_CREATED,
)
async def submit_code(
    problem_id: int,
    body: JudgeSubmitRequest,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JudgeSubmissionOut:
    if user.role != UserRole.student:
        raise HTTPException(
            status_code=403, detail="Only students can submit code"
        )

    problem = await _load_problem(db, problem_id)
    testcases = [(tc.input, tc.expected_output) for tc in problem.testcases]
    if not testcases:
        raise HTTPException(
            status_code=400, detail="Problem has no testcases configured"
        )

    verdict = await judge_service.judge_against_testcases(
        source_code=body.source_code,
        language_id=body.language_id,
        testcases=testcases,
    )

    submission = JudgeSubmission(
        problem_id=problem.id,
        student_id=user.id,
        language_id=body.language_id,
        source_code=body.source_code,
        status=verdict.status,
        stdout=verdict.stdout,
        stderr=verdict.stderr,
        time_ms=verdict.time_ms,
        memory_kb=verdict.memory_kb,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    # Fire-and-forget student notification for the verdict.
    background.add_task(
        _notify_verdict,
        student_id=user.id,
        problem_title=problem.title,
        verdict=verdict.status,
    )

    return JudgeSubmissionOut.model_validate(submission)


async def _notify_verdict(
    *, student_id: int, problem_title: str, verdict: str
) -> None:
    from core.database import SessionLocal

    async with SessionLocal() as db:
        await notification_service.notify(
            db,
            user_ids=[student_id],
            title=f"Code judge — {verdict}",
            body=f"Your submission for “{problem_title}” returned {verdict}.",
        )


@router.get("/submissions/mine", response_model=list[JudgeSubmissionOut])
async def list_my_submissions(
    problem_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[JudgeSubmissionOut]:
    stmt = select(JudgeSubmission).where(JudgeSubmission.student_id == user.id)
    if problem_id is not None:
        stmt = stmt.where(JudgeSubmission.problem_id == problem_id)
    stmt = stmt.order_by(JudgeSubmission.submitted_at.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [JudgeSubmissionOut.model_validate(s) for s in rows]


@router.get("/submissions/{submission_id}", response_model=JudgeSubmissionOut)
async def get_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JudgeSubmissionOut:
    sub = (
        await db.execute(
            select(JudgeSubmission).where(JudgeSubmission.id == submission_id)
        )
    ).scalar_one_or_none()
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    if user.role != UserRole.admin and sub.student_id != user.id:
        raise HTTPException(status_code=403, detail="Not your submission")
    return JudgeSubmissionOut.model_validate(sub)
