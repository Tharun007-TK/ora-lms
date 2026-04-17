"""Notification persistence + Redis pub/sub + SSE stream generator.

Design:
- Writes go to Postgres (durable). After commit, a compact JSON payload is
  published to a per-user Redis channel.
- Subscribers (SSE) attach to ``user:{id}:notifications`` and forward payloads
  to the browser in real time.
- If Redis is unavailable the system degrades to DB-only: the browser will
  still see notifications on page refresh or by polling, and writes never fail.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncIterator, Iterable

from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models.tables import Notification


log = logging.getLogger(__name__)


def _channel(user_id: int) -> str:
    return f"user:{user_id}:notifications"


async def _redis_client():
    try:
        import redis.asyncio as redis  # type: ignore
    except ImportError:
        return None
    try:
        return redis.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception:
        log.warning("Redis unavailable at %s", settings.REDIS_URL)
        return None


def _payload(notification: Notification) -> dict:
    return {
        "id": notification.id,
        "title": notification.title,
        "body": notification.body,
        "read": notification.read,
        "created_at": notification.created_at.isoformat(),
    }


async def publish_one(notification: Notification) -> None:
    client = await _redis_client()
    if client is None:
        return
    try:
        await client.publish(
            _channel(notification.user_id),
            json.dumps(_payload(notification), ensure_ascii=False),
        )
    except Exception:
        log.exception("Redis publish failed")
    finally:
        try:
            await client.aclose()
        except Exception:
            pass


async def notify(
    db: AsyncSession,
    *,
    user_ids: Iterable[int],
    title: str,
    body: str | None = None,
) -> list[Notification]:
    """Persist + publish notifications for a set of users."""
    ids = [uid for uid in {int(u) for u in user_ids} if uid > 0]
    if not ids:
        return []

    created: list[Notification] = []
    for uid in ids:
        n = Notification(user_id=uid, title=title, body=body, read=False)
        db.add(n)
        created.append(n)
    await db.commit()
    for n in created:
        await db.refresh(n)

    # Publish after commit so subscribers never see rows that rolled back.
    await asyncio.gather(*(publish_one(n) for n in created), return_exceptions=True)
    return created


async def sse_stream(user_id: int) -> AsyncIterator[str]:
    """Yield SSE frames for ``user_id``. Sends keepalive comments every 15 s."""
    client = await _redis_client()
    channel = _channel(user_id)

    # Open the initial comment so proxies flush headers.
    yield ": connected\n\n"

    if client is None:
        # No Redis: just heartbeat so the EventSource stays healthy; the UI
        # falls back to polling.
        while True:
            await asyncio.sleep(15)
            yield ": ping\n\n"

    pubsub = client.pubsub()
    try:
        await pubsub.subscribe(channel)
        last_ping = asyncio.get_event_loop().time()
        while True:
            try:
                message = await asyncio.wait_for(
                    pubsub.get_message(ignore_subscribe_messages=True, timeout=15.0),
                    timeout=20.0,
                )
            except asyncio.TimeoutError:
                message = None

            if message and message.get("type") == "message":
                data = message.get("data")
                if data:
                    yield f"data: {data}\n\n"

            now = asyncio.get_event_loop().time()
            if now - last_ping >= 15:
                yield ": ping\n\n"
                last_ping = now
    except asyncio.CancelledError:
        raise
    except Exception:
        log.exception("SSE stream error for user %s", user_id)
    finally:
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
        except Exception:
            pass
        try:
            await client.aclose()
        except Exception:
            pass
