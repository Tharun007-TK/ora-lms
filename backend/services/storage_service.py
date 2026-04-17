"""File storage abstraction.

Primary backend: Supabase Storage (signed URLs).
Dev fallback: local disk under ``backend/uploads/`` served at ``/files/<path>``.

The public API returns a short opaque path (e.g. ``supabase://bucket/key`` or
``local:<relative-path>``) which is persisted in the DB. Callers MUST call
:func:`resolve_url` before sending a file URL to the client so we never leak
raw Supabase object URLs.
"""
from __future__ import annotations

import os
import re
import secrets
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Final

from fastapi import HTTPException, UploadFile, status

from core.config import settings


LOCAL_ROOT: Final[Path] = Path(__file__).resolve().parent.parent / "uploads"
LOCAL_ROOT.mkdir(parents=True, exist_ok=True)

SIGNED_URL_TTL_SECONDS: Final[int] = 60 * 15  # 15 min

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


@dataclass(frozen=True)
class StoredFile:
    path: str  # opaque, stored in DB
    content_type: str | None


def _use_supabase() -> bool:
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY)


def _safe_name(filename: str) -> str:
    base = os.path.basename(filename or "file")
    stem, dot, ext = base.rpartition(".")
    stem = _SAFE_NAME.sub("-", stem or base).strip("-") or "file"
    ext = _SAFE_NAME.sub("", ext) if dot else ""
    return f"{stem}.{ext}" if ext else stem


def _object_key(prefix: str, filename: str) -> str:
    token = secrets.token_hex(6)
    return f"{prefix}/{uuid.uuid4().hex}-{token}-{_safe_name(filename)}"


def _supabase_client():
    # Lazy import so the backend can boot without supabase-py installed in dev.
    from supabase import create_client  # type: ignore

    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


async def upload_file(file: UploadFile, *, bucket: str, prefix: str) -> StoredFile:
    """Upload an ``UploadFile`` and return a DB-storable opaque path."""
    if file is None or file.filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided"
        )

    data = await file.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty"
        )

    key = _object_key(prefix, file.filename)
    content_type = file.content_type or "application/octet-stream"

    if _use_supabase():
        try:
            client = _supabase_client()
            client.storage.from_(bucket).upload(
                path=key,
                file=data,
                file_options={"content-type": content_type, "upsert": "false"},
            )
        except Exception as exc:  # pragma: no cover - depends on remote
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Supabase upload failed: {exc}",
            ) from exc
        return StoredFile(path=f"supabase://{bucket}/{key}", content_type=content_type)

    # Local fallback
    rel = Path(bucket) / key
    abs_path = LOCAL_ROOT / rel
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_bytes(data)
    return StoredFile(path=f"local:{rel.as_posix()}", content_type=content_type)


def resolve_url(stored_path: str | None) -> str | None:
    """Resolve an opaque DB path to a URL the browser can fetch.

    Supabase paths are converted to time-limited signed URLs. Local paths
    resolve to the backend ``/files/...`` route.
    """
    if not stored_path:
        return None

    if stored_path.startswith("supabase://"):
        rest = stored_path[len("supabase://") :]
        bucket, _, key = rest.partition("/")
        if not bucket or not key:
            return None
        try:
            client = _supabase_client()
            result = client.storage.from_(bucket).create_signed_url(
                key, SIGNED_URL_TTL_SECONDS
            )
            return result.get("signedURL") or result.get("signed_url")
        except Exception:
            return None

    if stored_path.startswith("local:"):
        rel = stored_path[len("local:") :]
        return f"/files/{rel}"

    return stored_path


def local_file_path(rel: str) -> Path | None:
    """Resolve a ``local:`` relative path to an absolute path, guarding traversal."""
    candidate = (LOCAL_ROOT / rel).resolve()
    try:
        candidate.relative_to(LOCAL_ROOT.resolve())
    except ValueError:
        return None
    return candidate if candidate.is_file() else None
