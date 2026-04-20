"""Judge0 CE async client — public instance, no auth.

Current mode: free public instance at https://ce.judge0.com. No authentication.

TODO: re-enable for RapidAPI prod
    When switching to RapidAPI, restore the commented ``X-RapidAPI-Key`` and
    ``X-RapidAPI-Host`` headers below and read ``JUDGE0_RAPIDAPI_KEY`` +
    ``JUDGE0_RAPIDAPI_HOST`` from settings.
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from core.config import settings


log = logging.getLogger(__name__)


class Judge0Error(Exception):
    """Raised when Judge0 returns an unrecoverable error."""


class Judge0Client:
    """Thin async client for Judge0 CE."""

    def __init__(self) -> None:
        url = settings.JUDGE0_API_URL
        if not url:
            raise RuntimeError("JUDGE0_API_URL is not set in environment")
        self.base_url = url.rstrip("/")
        self.timeout = settings.JUDGE0_TIMEOUT_SECONDS
        # TODO: re-enable for RapidAPI prod
        # self.auth_token = settings.JUDGE0_AUTH_TOKEN
        log.info(
            "Judge0 client initialized: %s (no auth, public instance)",
            self.base_url,
        )

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {
            "Content-Type": "application/json",
        }
        # TODO: re-enable for RapidAPI prod
        # if self.auth_token:
        #     headers["X-Auth-Token"] = self.auth_token
        #     headers["X-RapidAPI-Key"] = settings.JUDGE0_RAPIDAPI_KEY
        #     headers["X-RapidAPI-Host"] = settings.JUDGE0_RAPIDAPI_HOST
        return headers

    async def create_submission(
        self,
        source_code: str,
        language_id: int,
        stdin: Optional[str] = None,
        expected_output: Optional[str] = None,
        cpu_time_limit: float = 2.0,
        memory_limit: int = 128000,  # KB
    ) -> str:
        """Submit code. Returns the submission token."""
        payload = {
            "source_code": source_code,
            "language_id": language_id,
            "stdin": stdin,
            "expected_output": expected_output,
            "cpu_time_limit": cpu_time_limit,
            "memory_limit": memory_limit,
        }
        wait_flag = "true" if settings.JUDGE0_WAIT else "false"
        url = (
            f"{self.base_url}/submissions?base64_encoded=false&wait={wait_flag}"
        )

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.post(url, json=payload, headers=self._headers())
            except httpx.HTTPError as exc:
                raise Judge0Error(f"Judge0 unreachable: {exc}") from exc

        # TODO: re-enable for RapidAPI prod
        # if resp.status_code == 401:
        #     raise Judge0Error("Judge0 auth failed — check JUDGE0_AUTH_TOKEN")
        if resp.status_code == 429:
            raise RuntimeError(
                "Judge0 public instance rate limit hit — wait and retry, or switch to RapidAPI"
            )
        if resp.status_code >= 500:
            raise Judge0Error(f"Judge0 server error: {resp.status_code}")
        resp.raise_for_status()

        data = resp.json()
        token = data.get("token")
        if not token:
            raise Judge0Error(f"Judge0 returned no token: {data}")
        return token

    async def get_submission(self, token: str) -> dict:
        """Poll for a single submission result."""
        url = f"{self.base_url}/submissions/{token}?base64_encoded=false"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url, headers=self._headers())
            except httpx.HTTPError as exc:
                raise Judge0Error(f"Judge0 unreachable: {exc}") from exc

        # TODO: re-enable for RapidAPI prod
        # if resp.status_code == 401:
        #     raise Judge0Error("Judge0 auth failed — check JUDGE0_AUTH_TOKEN")
        if resp.status_code == 429:
            raise RuntimeError(
                "Judge0 public instance rate limit hit — wait and retry, or switch to RapidAPI"
            )
        resp.raise_for_status()
        return resp.json()

    async def about(self) -> dict:
        """Health-check probe (``/about``)."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(
                f"{self.base_url}/about", headers=self._headers()
            )
        resp.raise_for_status()
        return resp.json()


judge0_client = Judge0Client()
