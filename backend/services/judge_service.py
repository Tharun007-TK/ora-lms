"""Judge0 CE integration.

Handles code submission, polling, and verdict aggregation across test cases.
Swappable between the public RapidAPI endpoint and a self-hosted instance
through :data:`settings.JUDGE0_BASE_URL` / :data:`settings.JUDGE0_API_KEY`.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import HTTPException, status

from core.config import settings


log = logging.getLogger(__name__)

# Judge0 status ids (https://ce.judge0.com/statuses)
STATUS_IN_QUEUE = 1
STATUS_PROCESSING = 2
STATUS_ACCEPTED = 3
STATUS_WRONG_ANSWER = 4
STATUS_TIME_LIMIT_EXCEEDED = 5
STATUS_COMPILATION_ERROR = 6

LANGUAGE_MAP: dict[int, str] = {
    71: "Python 3",
    54: "C++ (GCC 9.2.0)",
    62: "Java (OpenJDK 13)",
    63: "JavaScript (Node 12)",
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
    # Runtime errors and everything else beyond CE
    if status_id >= 7:
        return "RE"
    return description.upper()[:10] or "ERR"


def _headers() -> dict[str, str]:
    h: dict[str, str] = {"Content-Type": "application/json"}
    if settings.JUDGE0_API_KEY:
        # RapidAPI-compatible headers; self-hosted instances ignore them.
        h["X-RapidAPI-Key"] = settings.JUDGE0_API_KEY
        h["X-RapidAPI-Host"] = settings.JUDGE0_HOST_HEADER
        h["Authorization"] = f"Bearer {settings.JUDGE0_API_KEY}"
    return h


@dataclass
class Verdict:
    status_id: int
    status: str  # AC/WA/TLE/RE/CE
    stdout: str | None
    stderr: str | None
    time_ms: int | None
    memory_kb: int | None


async def _submit(
    client: httpx.AsyncClient,
    *,
    source_code: str,
    language_id: int,
    stdin: str,
    expected_output: str | None,
) -> str:
    payload: dict[str, Any] = {
        "source_code": source_code,
        "language_id": language_id,
        "stdin": stdin,
    }
    if expected_output is not None:
        payload["expected_output"] = expected_output

    try:
        r = await client.post(
            "/submissions",
            params={"base64_encoded": "false", "wait": "false"},
            headers=_headers(),
            json=payload,
            timeout=20.0,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Judge0 unreachable: {exc}",
        ) from exc

    if r.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Judge0 submit failed ({r.status_code}): {r.text[:200]}",
        )
    data = r.json()
    token = data.get("token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Judge0 did not return a submission token",
        )
    log.info("Judge0 submit ok token=%s", token)
    return token


async def _poll(
    client: httpx.AsyncClient, token: str, *, max_seconds: float = 15.0
) -> Verdict:
    deadline = asyncio.get_event_loop().time() + max_seconds
    delay = 0.4
    while True:
        try:
            r = await client.get(
                f"/submissions/{token}",
                params={
                    "base64_encoded": "false",
                    "fields": "status,stdout,stderr,compile_output,time,memory",
                },
                headers=_headers(),
                timeout=10.0,
            )
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Judge0 poll failed: {exc}",
            ) from exc

        if r.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Judge0 poll error ({r.status_code})",
            )

        body = r.json()
        status_obj = body.get("status") or {}
        status_id = int(status_obj.get("id", 0))
        status_desc = str(status_obj.get("description") or "")

        if status_id not in (STATUS_IN_QUEUE, STATUS_PROCESSING):
            time_s = body.get("time")
            time_ms = int(float(time_s) * 1000) if time_s else None
            memory_kb = (
                int(body["memory"]) if body.get("memory") is not None else None
            )
            stderr = body.get("stderr") or body.get("compile_output")
            return Verdict(
                status_id=status_id,
                status=_short_status(status_id, status_desc),
                stdout=body.get("stdout"),
                stderr=stderr,
                time_ms=time_ms,
                memory_kb=memory_kb,
            )

        if asyncio.get_event_loop().time() > deadline:
            return Verdict(
                status_id=STATUS_TIME_LIMIT_EXCEEDED,
                status="TLE",
                stdout=None,
                stderr="Judge0 polling exceeded client deadline",
                time_ms=None,
                memory_kb=None,
            )
        await asyncio.sleep(delay)
        delay = min(delay * 1.5, 2.0)


async def run_once(
    *,
    source_code: str,
    language_id: int,
    stdin: str,
    expected_output: str | None = None,
) -> Verdict:
    base_url = settings.JUDGE0_BASE_URL.rstrip("/")
    async with httpx.AsyncClient(base_url=base_url) as client:
        token = await _submit(
            client,
            source_code=source_code,
            language_id=language_id,
            stdin=stdin,
            expected_output=expected_output,
        )
        return await _poll(client, token)


async def judge_against_testcases(
    *,
    source_code: str,
    language_id: int,
    testcases: list[tuple[str, str]],
) -> Verdict:
    """Run submissions until the first failure, else return AC.

    ``testcases`` is a list of ``(stdin, expected_output)`` pairs.
    Aggregates the worst verdict plus max-time/max-memory across passing cases.
    """
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
