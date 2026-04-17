from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import require_admin
from core.database import get_db
from models.tables import User, UserRole
from schemas.requests import UserBrief, UserOut


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
async def list_users(
    role: UserRole | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[UserOut]:
    stmt = select(User).order_by(User.created_at.desc())
    if role is not None:
        stmt = stmt.where(User.role == role)
    result = await db.execute(stmt)
    return [UserOut.model_validate(u) for u in result.scalars().all()]


@router.get("/faculty", response_model=list[UserBrief])
async def list_faculty_brief(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[UserBrief]:
    result = await db.execute(
        select(User).where(User.role == UserRole.faculty).order_by(User.name)
    )
    return [UserBrief.model_validate(u) for u in result.scalars().all()]
