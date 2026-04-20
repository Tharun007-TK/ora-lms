"""Async submission helper — submit + poll until terminal."""
from __future__ import annotations

import asyncio

from services.judge0_client import Judge0Error, judge0_client


POLL_INTERVAL = 0.5  # seconds
MAX_POLLS = 40       # 20 seconds total ceiling

# Status IDs per Judge0 docs:
# 1 = In Queue, 2 = Processing, 3 = Accepted, >=4 = terminal errors/verdicts
TERMINAL_STATUSES = {3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14}


async def run_and_wait(
    source_code: str,
    language_id: int,
    stdin: str | None = None,
    expected_output: str | None = None,
    cpu_time_limit: float = 2.0,
    memory_limit: int = 128000,
) -> dict:
    """Submit and poll until a terminal status appears or we time out."""
    token = await judge0_client.create_submission(
        source_code=source_code,
        language_id=language_id,
        stdin=stdin,
        expected_output=expected_output,
        cpu_time_limit=cpu_time_limit,
        memory_limit=memory_limit,
    )

    for _ in range(MAX_POLLS):
        result = await judge0_client.get_submission(token)
        status_id = (result.get("status") or {}).get("id")
        if status_id in TERMINAL_STATUSES:
            return result
        await asyncio.sleep(POLL_INTERVAL)

    raise Judge0Error(
        f"Judge0 submission {token} did not finish in time"
    )
