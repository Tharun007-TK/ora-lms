"""File storage abstraction.

Primary backend: Supabase Storage (signed URLs).
Dev fallback: local disk under ``backend/uploads/`` served at ``/files/<path>``.

The public API returns a short opaque path (e.g. ``supabase://bucket/key`` or
``local:<relative-path>``) which is persisted in the DB. Callers MUST call
:func:`resolve_url` before sending a file URL to the client so we never leak
raw Supabase object URLs.
"""
from __future__ import annotations

import asyncio
import io
import os
import re
import secrets
import threading
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Final

from fastapi import HTTPException, UploadFile, status

from core.config import settings


LOCAL_ROOT: Final[Path] = Path(__file__).resolve().parent.parent / "uploads"
LOCAL_ROOT.mkdir(parents=True, exist_ok=True)

SIGNED_URL_TTL_SECONDS: Final[int] = 60 * 15  # 15 min (default)
PROFILE_SIGNED_URL_TTL_SECONDS: Final[int] = 60 * 60  # 1 hour (avatars/covers)

AVATAR_MAX_BYTES: Final[int] = 2 * 1024 * 1024  # 2 MB
COVER_MAX_BYTES: Final[int] = 5 * 1024 * 1024  # 5 MB
ALLOWED_IMAGE_MIME: Final[frozenset[str]] = frozenset(
    {"image/jpeg", "image/png", "image/webp"}
)
_IMAGE_EXT: Final[dict[str, str]] = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

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


# Module-level cached client. supabase-py is sync and constructs an httpx
# client per call — building one per request was both wasteful and slow under
# concurrency. Cache after first construction; the lock guards first-call
# double-creation.
_supabase_singleton = None
_supabase_singleton_lock = threading.Lock()


def _supabase_client():
    # Lazy import so the backend can boot without supabase-py installed in dev.
    global _supabase_singleton
    if _supabase_singleton is not None:
        return _supabase_singleton
    with _supabase_singleton_lock:
        if _supabase_singleton is not None:
            return _supabase_singleton
        from supabase import create_client  # type: ignore

        _supabase_singleton = create_client(
            settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY
        )
        return _supabase_singleton


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
            # supabase-py's storage SDK is sync (httpx underneath). Offload so
            # the event loop is not blocked while the bytes upload to Supabase.
            await asyncio.to_thread(
                client.storage.from_(bucket).upload,
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


def resolve_url(
    stored_path: str | None,
    *,
    ttl_seconds: int = SIGNED_URL_TTL_SECONDS,
) -> str | None:
    """Resolve an opaque DB path to a URL the browser can fetch.

    Supabase paths are converted to time-limited signed URLs. Local paths
    resolve to the backend ``/files/...`` route.

    NOTE: the supabase signed-URL roundtrip is sync HTTP. Async callers
    should prefer :func:`resolve_url_async` so they don't block the event
    loop. Sync callers (CSV exports, local-only paths) can use this
    function directly.
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
                key, ttl_seconds
            )
            return result.get("signedURL") or result.get("signed_url")
        except Exception:
            return None

    if stored_path.startswith("local:"):
        rel = stored_path[len("local:") :]
        return f"/files/{rel}"

    return stored_path


async def resolve_url_async(
    stored_path: str | None,
    *,
    ttl_seconds: int = SIGNED_URL_TTL_SECONDS,
) -> str | None:
    """Async variant of :func:`resolve_url`.

    Cheap branches (no path / local: / unknown scheme) run inline; the
    Supabase signed-URL HTTP call is offloaded to a worker thread so it
    does not block the event loop.
    """
    if not stored_path or not stored_path.startswith("supabase://"):
        return resolve_url(stored_path, ttl_seconds=ttl_seconds)
    return await asyncio.to_thread(
        resolve_url, stored_path, ttl_seconds=ttl_seconds
    )


async def upload_image(
    file: UploadFile,
    *,
    bucket: str,
    user_id: int,
    kind: str,
    max_bytes: int,
) -> StoredFile:
    """Upload a profile image (avatar/cover) with server-side validation.

    - Size capped at ``max_bytes``.
    - Content-type restricted to JPEG/PNG/WebP.
    - Image bytes are verified with Pillow to reject malformed/spoofed files.
    - Filename pattern: ``{user_id}-{kind}-{timestamp}.{ext}``.
    """
    if file is None or file.filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided"
        )

    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG, or WebP images are allowed",
        )

    data = await file.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty"
        )
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image too large (limit {max_bytes // (1024 * 1024)} MB)",
        )

    try:
        from PIL import Image, UnidentifiedImageError  # lazy import
    except ImportError:  # pragma: no cover - env guard
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Image validation unavailable (Pillow not installed)",
        )

    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
    except (UnidentifiedImageError, Exception):  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is not a valid image",
        )

    ext = _IMAGE_EXT.get(content_type, "bin")
    key = f"{user_id}-{kind}-{int(time.time())}.{ext}"

    if _use_supabase():
        try:
            client = _supabase_client()
            await asyncio.to_thread(
                client.storage.from_(bucket).upload,
                path=key,
                file=data,
                file_options={"content-type": content_type, "upsert": "true"},
            )
        except Exception as exc:  # pragma: no cover - depends on remote
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Supabase upload failed: {exc}",
            ) from exc
        return StoredFile(path=f"supabase://{bucket}/{key}", content_type=content_type)

    rel = Path(bucket) / key
    abs_path = LOCAL_ROOT / rel
    abs_path.parent.mkdir(parents=True, exist_ok=True)
    abs_path.write_bytes(data)
    return StoredFile(path=f"local:{rel.as_posix()}", content_type=content_type)


def local_file_path(rel: str) -> Path | None:
    """Resolve a ``local:`` relative path to an absolute path, guarding traversal."""
    candidate = (LOCAL_ROOT / rel).resolve()
    try:
        candidate.relative_to(LOCAL_ROOT.resolve())
    except ValueError:
        return None
    return candidate if candidate.is_file() else None
