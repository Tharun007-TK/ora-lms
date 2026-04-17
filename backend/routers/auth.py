from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from core.config import settings
from core.database import get_db
from models.tables import User, UserRole
from schemas.requests import (
    AuthResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=settings.JWT_EXPIRES_MINUTES * 60,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/",
        domain=settings.COOKIE_DOMAIN,
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )

    token = create_access_token(subject=user.id, role=user.role.value)
    _set_session_cookie(response, token)
    return AuthResponse(user=UserOut.model_validate(user))


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    # Admin accounts cannot be self-registered
    if payload.role == UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts cannot be self-registered",
        )

    if not settings.ALLOW_OPEN_REGISTRATION and payload.role != UserRole.student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Open registration is disabled",
        )

    existing = await db.execute(
        select(User.id).where(User.email == payload.email.lower())
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        name=payload.name,
        role=payload.role,
        department_id=payload.department_id,
        is_active=True,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    await db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role.value)
    _set_session_cookie(response, token)
    return AuthResponse(user=UserOut.model_validate(user))


@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response) -> MessageResponse:
    _clear_session_cookie(response)
    return MessageResponse(detail="Logged out")


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)
