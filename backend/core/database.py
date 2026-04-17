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


def _build_engine() -> AsyncEngine:
    url = settings.DATABASE_URL
    kwargs: dict[str, Any] = {
        "echo": settings.DEBUG,
        "pool_pre_ping": True,
        "future": True,
    }
    # asyncpg does not support statement_cache issues with pgbouncer etc.
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
