"""Higher-level Judge0 helpers for the rest of the backend.

Delegates all HTTP traffic to :mod:`services.judge0_client` +
:mod:`services.judge0_runner`. The RapidAPI path is commented out; this module
currently speaks the public Judge0 CE instance via the single env var
``JUDGE0_API_URL``.

Public surface preserved so existing callers (``routers/judge.py``,
``routers/coding_assessments.py``) keep working:

- ``LANGUAGE_MAP``, ``LANGUAGE_ID_BY_NAME``, ``SHORT_STATUS``
- ``Verdict``, ``TestCaseResult``, ``EvaluationResult``
- ``run_once``, ``judge_against_testcases``, ``evaluate_submission``
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

from fastapi import HTTPException, status

from core.config import settings
from services.judge0_client import Judge0Error
from services.judge0_runner import run_and_wait


log = logging.getLogger(__name__)

# Judge0 status ids (https://ce.judge0.com/statuses)
STATUS_IN_QUEUE = 1
STATUS_PROCESSING = 2
STATUS_ACCEPTED = 3
STATUS_WRONG_ANSWER = 4
STATUS_TIME_LIMIT_EXCEEDED = 5
STATUS_COMPILATION_ERROR = 6

LANGUAGE_MAP: dict[int, str] = {
    50: "C (GCC 9.2.0)",
    71: "Python 3",
    54: "C++ (GCC 9.2.0)",
    62: "Java (OpenJDK 13)",
    63: "JavaScript (Node 12)",
}

LANGUAGE_ID_BY_NAME: dict[str, int] = {
    "python": 71,
    "c": 50,
    "cpp": 54,
    "java": 62,
    "javascript": 63,
}

SHORT_STATUS: dict[int, str] = {
    STATUS_ACCEPTED: "AC",
    STATUS_WRONG_ANSWER: "WA",
    STATUS_TIME_LIMIT_EXCEEDED: "TLE",
    STATUS_COMPILATION_ERROR: "CE",
}


def _short_status(status_id: int, description: str) -> str:
    if status_id in SHORT_STATUS:
        return SHORT_STATUS[status_id]
    if status_id >= 7:
        return "RE"
    return description.upper()[:10] or "ERR"


@dataclass
class Verdict:
    status_id: int
    status: str  # AC/WA/TLE/RE/CE
    stdout: str | None
    stderr: str | None
    time_ms: int | None
    memory_kb: int | None


def _result_to_verdict(body: dict) -> Verdict:
    status_obj = body.get("status") or {}
    status_id = int(status_obj.get("id", 0))
    status_desc = str(status_obj.get("description") or "")
    time_s = body.get("time")
    time_ms = int(float(time_s) * 1000) if time_s else None
    memory_kb = int(body["memory"]) if body.get("memory") is not None else None
    stderr = body.get("stderr") or body.get("compile_output")
    return Verdict(
        status_id=status_id,
        status=_short_status(status_id, status_desc),
        stdout=body.get("stdout"),
        stderr=stderr,
        time_ms=time_ms,
        memory_kb=memory_kb,
    )


async def run_once(
    *,
    source_code: str,
    language_id: int,
    stdin: str,
    expected_output: str | None = None,
) -> Verdict:
    """Submit + poll a single test case. Raises HTTP 502 on Judge0 failure."""
    try:
        body = await run_and_wait(
            source_code=source_code,
            language_id=language_id,
            stdin=stdin,
            expected_output=expected_output,
        )
    except Judge0Error as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Judge0 error: {exc}",
        ) from exc
    return _result_to_verdict(body)


async def judge_each_testcase(
    *,
    source_code: str,
    language_id: int,
    testcases: list[tuple[str, str]],
) -> list[Verdict]:
    """Run every test case and return one Verdict each, in order.

    Unlike :func:`judge_against_testcases`, this never short-circuits — the
    Code Arena UI needs to render pass/fail for every case.
    """
    if language_id not in LANGUAGE_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language_id {language_id}. Allowed: "
            + ", ".join(f"{k} ({v})" for k, v in LANGUAGE_MAP.items()),
        )
    results: list[Verdict] = []
    for stdin, expected in testcases:
        v = await run_once(
            source_code=source_code,
            language_id=language_id,
            stdin=stdin,
            expected_output=expected,
        )
        results.append(v)
    return results


async def judge_against_testcases(
    *,
    source_code: str,
    language_id: int,
    testcases: list[tuple[str, str]],
) -> Verdict:
    """Run until the first non-AC verdict; otherwise return AC aggregated."""
    if language_id not in LANGUAGE_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language_id {language_id}. Allowed: "
            + ", ".join(f"{k} ({v})" for k, v in LANGUAGE_MAP.items()),
        )

    max_time: int | None = None
    max_mem: int | None = None
    for stdin, expected in testcases:
        v = await run_once(
            source_code=source_code,
            language_id=language_id,
            stdin=stdin,
            expected_output=expected,
        )
        if v.time_ms is not None:
            max_time = v.time_ms if max_time is None else max(max_time, v.time_ms)
        if v.memory_kb is not None:
            max_mem = v.memory_kb if max_mem is None else max(max_mem, v.memory_kb)
        if v.status != "AC":
            v.time_ms = max_time
            v.memory_kb = max_mem
            return v

    return Verdict(
        status_id=STATUS_ACCEPTED,
        status="AC",
        stdout=None,
        stderr=None,
        time_ms=max_time,
        memory_kb=max_mem,
    )


# ---------- Coding Assessments (UPDATE.md) ----------


@dataclass
class TestCaseResult:
    test_case_id: int
    passed: bool
    stdout: str | None
    stderr: str | None
    time_ms: int | None
    memory_kb: int | None
    weight: int
    is_hidden: bool


@dataclass
class EvaluationResult:
    score: int
    max_score: int
    status: str  # 'completed' | 'error'
    test_case_results: list[dict]


def _mock_enabled() -> bool:
    return settings.JUDGE0_MOCK


def _mock_run(source_code: str, expected_output: str) -> tuple[bool, str, str | None]:
    passed = expected_output.strip() in source_code
    stdout = expected_output if passed else "(mock stdout)"
    stderr = None if passed else "mock: expected output not found in source"
    return passed, stdout, stderr


async def evaluate_submission(
    *,
    source_code: str,
    language: str,
    test_cases: list,  # list[CodingTestCase]
    max_score: int,
    scoring_mode: str,  # 'all_or_nothing' | 'partial'
    time_limit_seconds: int = 2,
) -> EvaluationResult:
    """Run all test cases, aggregate a score."""
    if language not in LANGUAGE_ID_BY_NAME:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{language}'. Allowed: "
            + ", ".join(LANGUAGE_ID_BY_NAME.keys()),
        )
    language_id = LANGUAGE_ID_BY_NAME[language]

    use_mock = _mock_enabled()
    if use_mock:
        log.warning(
            "JUDGE0 MOCK MODE ACTIVE — returning deterministic fake results. "
            "Set JUDGE0_MOCK=false for real evaluation."
        )

    results: list[TestCaseResult] = []

    for tc in test_cases:
        if use_mock:
            passed, stdout, stderr = _mock_run(source_code, tc.expected_output)
            results.append(
                TestCaseResult(
                    test_case_id=tc.id,
                    passed=passed,
                    stdout=stdout,
                    stderr=stderr,
                    time_ms=1,
                    memory_kb=1024,
                    weight=tc.weight,
                    is_hidden=tc.is_hidden,
                )
            )
            continue

        try:
            body = await run_and_wait(
                source_code=source_code,
                language_id=language_id,
                stdin=tc.input,
                expected_output=tc.expected_output,
                cpu_time_limit=float(time_limit_seconds),
            )
        except Judge0Error as exc:
            log.error("Judge0 run failed for testcase %s: %s", tc.id, exc)
            results.append(
                TestCaseResult(
                    test_case_id=tc.id,
                    passed=False,
                    stdout=None,
                    stderr=f"judge0_error: {exc}",
                    time_ms=None,
                    memory_kb=None,
                    weight=tc.weight,
                    is_hidden=tc.is_hidden,
                )
            )
            continue

        verdict = _result_to_verdict(body)
        passed = verdict.status == "AC"
        results.append(
            TestCaseResult(
                test_case_id=tc.id,
                passed=passed,
                stdout=verdict.stdout,
                stderr=verdict.stderr,
                time_ms=verdict.time_ms,
                memory_kb=verdict.memory_kb,
                weight=tc.weight,
                is_hidden=tc.is_hidden,
            )
        )

    total_weight = sum(r.weight for r in results) or 1
    if scoring_mode == "all_or_nothing":
        score = max_score if all(r.passed for r in results) else 0
    else:
        earned_weight = sum(r.weight for r in results if r.passed)
        score = round(max_score * earned_weight / total_weight)

    serialized = [
        {
            "test_case_id": r.test_case_id,
            "passed": r.passed,
            "stdout": r.stdout,
            "stderr": r.stderr,
            "time_ms": r.time_ms,
            "memory_kb": r.memory_kb,
            "weight": r.weight,
            "is_hidden": r.is_hidden,
        }
        for r in results
    ]

    return EvaluationResult(
        score=score,
        max_score=max_score,
        status="completed",
        test_case_results=serialized,
    )
