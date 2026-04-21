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
