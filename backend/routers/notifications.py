from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user
from core.database import get_db
from models.tables import Notification, User
from schemas.requests import MessageResponse, NotificationOut
from services import notification_service


router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[NotificationOut]:
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        stmt = stmt.where(Notification.read.is_(False))
    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return [NotificationOut.model_validate(n) for n in rows]


@router.get("/unread-count", response_model=dict[str, int])
async def unread_count(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, int]:
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id, Notification.read.is_(False)
        )
    )
    return {"count": int(result.scalar_one() or 0)}


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> NotificationOut:
    notif = (
        await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if notif is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    if not notif.read:
        notif.read = True
        await db.commit()
        await db.refresh(notif)
    return NotificationOut.model_validate(notif)


@router.post("/read-all", response_model=MessageResponse)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageResponse:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.read.is_(False))
        .values(read=True)
    )
    await db.commit()
    return MessageResponse(detail="All notifications marked as read")


@router.get("/stream")
async def stream(
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    headers = {
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    }
    return StreamingResponse(
        notification_service.sse_stream(user.id),
        media_type="text/event-stream",
        headers=headers,
    )
