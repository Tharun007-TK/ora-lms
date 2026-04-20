# Ora LMS — Judge0 Integration Migration

**Context:** Migrating from RapidAPI-hosted Judge0 to a dual-environment setup:
- **Development:** Public Judge0 CE instance (`https://ce.judge0.com`) — no auth, no key
- **Production:** Self-hosted Judge0 CE on our own VPS — auth via `X-Auth-Token`

**Goal:** A single code path that works for both, with environment switching via `.env` only. No RapidAPI references anywhere in the codebase.

---

## 1. Replace `.env` entries

### Remove these old entries

```env
# Judge 0
JUDGE0_BASE_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=<rotated-and-revoked>
JUDGE0_HOST_HEADER=judge0-ce.p.rapidapi.com
```

### Replace with this

```env
# Judge0 — Code Execution
# Dev: https://ce.judge0.com (public, no auth)
# Prod: https://judge0.ora.yourdomain.com (self-hosted, auth required)
JUDGE0_BASE_URL=https://ce.judge0.com
JUDGE0_AUTH_TOKEN=
JUDGE0_WAIT=false
JUDGE0_TIMEOUT_SECONDS=10
```

**Rules:**
- `JUDGE0_AUTH_TOKEN` is **empty in development** and **set to a strong random token in production**.
- `JUDGE0_WAIT=false` — always use async submission. Sync (`wait=true`) is unreliable under load and the public instance often rejects it.
- Never commit the production `.env` — only `.env.example` with empty values.

### `.env.example`

```env
JUDGE0_BASE_URL=https://ce.judge0.com
JUDGE0_AUTH_TOKEN=
JUDGE0_WAIT=false
JUDGE0_TIMEOUT_SECONDS=10
```

---

## 2. FastAPI — settings module

Update `app/core/config.py` (or wherever Pydantic `Settings` lives):

```python
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # ... existing fields ...

    JUDGE0_BASE_URL: str = Field(default="https://ce.judge0.com")
    JUDGE0_AUTH_TOKEN: str = Field(default="")
    JUDGE0_WAIT: bool = Field(default=False)
    JUDGE0_TIMEOUT_SECONDS: int = Field(default=10)

    class Config:
        env_file = ".env"
```

---

## 3. FastAPI — Judge0 client

Create `app/services/judge0_client.py`. Replace any existing RapidAPI client entirely.

```python
import httpx
from typing import Optional
from app.core.config import settings


class Judge0Error(Exception):
    """Raised when Judge0 returns an unrecoverable error."""


class Judge0Client:
    """
    Thin async client for Judge0 CE.
    Works against both the public instance (no auth) and our self-hosted
    instance (X-Auth-Token header).
    """

    def __init__(self) -> None:
        self.base_url = settings.JUDGE0_BASE_URL.rstrip("/")
        self.auth_token = settings.JUDGE0_AUTH_TOKEN
        self.timeout = settings.JUDGE0_TIMEOUT_SECONDS

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["X-Auth-Token"] = self.auth_token
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
        """Submit code. Returns submission token."""
        payload = {
            "source_code": source_code,
            "language_id": language_id,
            "stdin": stdin,
            "expected_output": expected_output,
            "cpu_time_limit": cpu_time_limit,
            "memory_limit": memory_limit,
        }
        url = f"{self.base_url}/submissions?base64_encoded=false&wait={str(settings.JUDGE0_WAIT).lower()}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload, headers=self._headers())

        if resp.status_code == 401:
            raise Judge0Error("Judge0 auth failed — check JUDGE0_AUTH_TOKEN")
        if resp.status_code == 429:
            raise Judge0Error("Judge0 rate limited")
        if resp.status_code >= 500:
            raise Judge0Error(f"Judge0 server error: {resp.status_code}")
        resp.raise_for_status()

        data = resp.json()
        token = data.get("token")
        if not token:
            raise Judge0Error(f"Judge0 returned no token: {data}")
        return token

    async def get_submission(self, token: str) -> dict:
        """Poll for a submission result."""
        url = f"{self.base_url}/submissions/{token}?base64_encoded=false"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, headers=self._headers())

        if resp.status_code == 401:
            raise Judge0Error("Judge0 auth failed — check JUDGE0_AUTH_TOKEN")
        if resp.status_code == 429:
            raise Judge0Error("Judge0 rate limited")
        resp.raise_for_status()
        return resp.json()

    async def about(self) -> dict:
        """Health check — useful for /health endpoint and startup smoke test."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(f"{self.base_url}/about", headers=self._headers())
        resp.raise_for_status()
        return resp.json()


judge0_client = Judge0Client()
```

### Key changes from the RapidAPI version

| Old (RapidAPI) | New (CE / self-hosted) |
|---|---|
| `X-RapidAPI-Key` header | `X-Auth-Token` header (prod only) |
| `X-RapidAPI-Host` header | **Removed entirely** |
| Hardcoded host header logic | Simple base URL |
| Sync-friendly (`wait=true`) | Async-first (`wait=false`) |

---

## 4. Polling strategy

Judge0 async submissions need polling. Do not poll from the browser — always proxy through the backend.

Add `app/services/judge0_runner.py`:

```python
import asyncio
from app.services.judge0_client import judge0_client, Judge0Error

POLL_INTERVAL = 0.5  # seconds
MAX_POLLS = 40       # 20 seconds total ceiling

# Status IDs per Judge0 docs:
# 1 = In Queue, 2 = Processing, 3 = Accepted, others = terminal errors
TERMINAL_STATUSES = {3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14}


async def run_and_wait(
    source_code: str,
    language_id: int,
    stdin: str | None = None,
    expected_output: str | None = None,
) -> dict:
    token = await judge0_client.create_submission(
        source_code=source_code,
        language_id=language_id,
        stdin=stdin,
        expected_output=expected_output,
    )

    for _ in range(MAX_POLLS):
        result = await judge0_client.get_submission(token)
        status_id = result.get("status", {}).get("id")
        if status_id in TERMINAL_STATUSES:
            return result
        await asyncio.sleep(POLL_INTERVAL)

    raise Judge0Error(f"Judge0 submission {token} did not finish in time")
```

---

## 5. Health check

Add Judge0 to the `/health` endpoint so you know fast when it's down:

```python
from fastapi import APIRouter
from app.services.judge0_client import judge0_client

router = APIRouter()

@router.get("/health")
async def health():
    judge0_ok = True
    try:
        await judge0_client.about()
    except Exception:
        judge0_ok = False
    return {"status": "ok", "judge0": judge0_ok}
```

---

## 6. Next.js frontend

Nothing in the Next.js app should reference Judge0 directly. The frontend calls **your FastAPI endpoint** (e.g. `POST /api/code/run`), which internally calls Judge0. This is non-negotiable for security — browser-side Judge0 calls would expose the production auth token.

Remove any `NEXT_PUBLIC_JUDGE0_*` env vars if they exist.

---

## 7. Self-hosting deployment (production only)

Reference — not for Claude Code to implement, handled separately on the VPS:

- Hetzner CX22 minimum (4GB RAM), Germany or Finland region.
- Clone `https://github.com/judge0/judge0`, use the bundled `docker-compose.yml`.
- In Judge0's own `judge0.conf`:
  - Set `AUTHN_HEADER=X-Auth-Token`
  - Set `AUTHN_TOKEN=<strong-random-token>` — same value goes into Ora's `JUDGE0_AUTH_TOKEN`
  - Set `MAX_QUEUE_SIZE=200`
  - Set `MAX_CPU_TIME_LIMIT=5`
  - Set `MAX_MEMORY_LIMIT=256000`
- Caddy or Nginx reverse proxy with HTTPS in front — never expose port 2358.
- Firewall rule: only the Ora backend's IP can reach Judge0. Close 2358 to the public internet.

---

## 8. Verification checklist (run after implementation)

- [ ] `.env` has no `JUDGE0_API_KEY` or `JUDGE0_HOST_HEADER` entries
- [ ] `grep -r "rapidapi" .` returns zero results in the codebase
- [ ] `grep -r "X-RapidAPI" .` returns zero results
- [ ] `/health` endpoint returns `"judge0": true` locally against `ce.judge0.com`
- [ ] A test submission (hello-world Python, language_id=71) returns `status.id == 3` (Accepted)
- [ ] Switching `JUDGE0_BASE_URL` to a fake URL causes `/health` to return `"judge0": false` without crashing the app