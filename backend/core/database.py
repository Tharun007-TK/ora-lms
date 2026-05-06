from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from core.config import settings


class Base(DeclarativeBase):
    """Root SQLAlchemy declarative base for all ORM models."""

    pass


def _normalise_db_url(url: str) -> str:
    # Supabase and most hosting panels emit postgres:// or postgresql://
    # SQLAlchemy async requires postgresql+asyncpg://
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://"):]
    if not url.startswith("postgresql+asyncpg://"):
        scheme = url.split("://")[0]
        raise ValueError(
            f"DATABASE_URL has unsupported scheme {scheme!r}. "
            "Expected postgresql+asyncpg://, postgresql://, or postgres://"
        )
    return url


def _build_engine() -> AsyncEngine:
    url = _normalise_db_url(settings.DATABASE_URL)
    kwargs: dict[str, Any] = {
        "echo": settings.DEBUG,
        "pool_pre_ping": True,
        "future": True,
        # Default pool (5 + 10 overflow) was starving under 64 concurrent
        # users — some routes hold two sessions per request. Bump both so
        # the pool absorbs bursty load on a single uvicorn worker without
        # queueing on get_db().
        "pool_size": 20,
        "max_overflow": 20,
    }
    return create_async_engine(url, **kwargs)


engine: AsyncEngine = _build_engine()
SessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
