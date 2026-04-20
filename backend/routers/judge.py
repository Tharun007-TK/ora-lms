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
    JudgeRunResult,
    JudgeSubmissionOut,
    JudgeSubmitRequest,
    JudgeSubmitResult,
    JudgeTestCaseResult,
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


@router.post("/problems/{problem_id}/run", response_model=JudgeRunResult)
async def run_code(
    problem_id: int,
    body: JudgeSubmitRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JudgeRunResult:
    """Compile + run against VISIBLE test cases only. No persist."""
    if user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Only students can run code")

    problem = await _load_problem(db, problem_id)
    visible_tcs = [tc for tc in problem.testcases if not tc.is_hidden]
    if not visible_tcs:
        raise HTTPException(
            status_code=400,
            detail="No visible test cases to run against",
        )

    testcases = [(tc.input, tc.expected_output) for tc in visible_tcs]
    verdicts = await judge_service.judge_each_testcase(
        source_code=body.source_code,
        language_id=body.language_id,
        testcases=testcases,
    )

    per_tc: list[JudgeTestCaseResult] = []
    for idx, (tc, v) in enumerate(zip(visible_tcs, verdicts)):
        per_tc.append(
            JudgeTestCaseResult(
                index=idx,
                is_hidden=False,
                status=v.status,
                passed=v.status == "AC",
                stdin=tc.input,
                expected_output=tc.expected_output,
                actual_output=v.stdout,
                stderr=v.stderr,
                time_ms=v.time_ms,
                memory_kb=v.memory_kb,
            )
        )

    passed_count = sum(1 for r in per_tc if r.passed)
    # Aggregated status: AC if all pass, else first failure verdict
    agg_status = "AC"
    first_fail = next((r for r in per_tc if not r.passed), None)
    if first_fail:
        agg_status = first_fail.status
    max_time = max((r.time_ms for r in per_tc if r.time_ms is not None), default=None)
    max_mem = max(
        (r.memory_kb for r in per_tc if r.memory_kb is not None), default=None
    )
    first_stderr = next((r.stderr for r in per_tc if r.stderr), None)

    return JudgeRunResult(
        status=agg_status,
        stdout=None,
        stderr=first_stderr,
        time_ms=max_time,
        memory_kb=max_mem,
        passed=passed_count,
        total=len(visible_tcs),
        test_cases=per_tc,
    )


@router.post(
    "/problems/{problem_id}/submit",
    response_model=JudgeSubmitResult,
    status_code=status.HTTP_201_CREATED,
)
async def submit_code(
    problem_id: int,
    body: JudgeSubmitRequest,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JudgeSubmitResult:
    if user.role != UserRole.student:
        raise HTTPException(
            status_code=403, detail="Only students can submit code"
        )

    problem = await _load_problem(db, problem_id)
    if not problem.testcases:
        raise HTTPException(
            status_code=400, detail="Problem has no testcases configured"
        )

    tcs = list(problem.testcases)
    inputs = [(tc.input, tc.expected_output) for tc in tcs]
    verdicts = await judge_service.judge_each_testcase(
        source_code=body.source_code,
        language_id=body.language_id,
        testcases=inputs,
    )

    per_tc: list[JudgeTestCaseResult] = []
    for idx, (tc, v) in enumerate(zip(tcs, verdicts)):
        per_tc.append(
            JudgeTestCaseResult(
                index=idx,
                is_hidden=tc.is_hidden,
                status=v.status,
                passed=v.status == "AC",
                stdin=None if tc.is_hidden else tc.input,
                expected_output=None if tc.is_hidden else tc.expected_output,
                actual_output=None if tc.is_hidden else v.stdout,
                stderr=v.stderr,
                time_ms=v.time_ms,
                memory_kb=v.memory_kb,
            )
        )

    passed = sum(1 for r in per_tc if r.passed)
    total = len(per_tc)
    agg_status = "AC" if passed == total else next(
        (r.status for r in per_tc if not r.passed), "WA"
    )
    max_time = max((r.time_ms for r in per_tc if r.time_ms is not None), default=None)
    max_mem = max(
        (r.memory_kb for r in per_tc if r.memory_kb is not None), default=None
    )
    first_stderr = next((r.stderr for r in per_tc if r.stderr), None)

    submission = JudgeSubmission(
        problem_id=problem.id,
        student_id=user.id,
        language_id=body.language_id,
        source_code=body.source_code,
        status=agg_status,
        stdout=None,
        stderr=first_stderr,
        time_ms=max_time,
        memory_kb=max_mem,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    background.add_task(
        _notify_verdict,
        student_id=user.id,
        problem_title=problem.title,
        verdict=agg_status,
    )

    return JudgeSubmitResult(
        submission_id=submission.id,
        status=agg_status,
        passed=passed,
        total=total,
        time_ms=max_time,
        memory_kb=max_mem,
        stdout=None,
        stderr=first_stderr,
        submitted_at=submission.submitted_at,
        test_cases=per_tc,
    )


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
