from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.auth import get_current_user, get_current_user_optional
from core.config import settings
from core.database import get_db
from models.tables import Course, Department, Enrollment, User, UserProfile, UserRole
from schemas.requests import UserProfileOut, UserProfileUpdate
from services import storage_service


router = APIRouter(prefix="/profile", tags=["profile"])


async def _get_or_create_profile(db: AsyncSession, user_id: int) -> UserProfile:
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = UserProfile(user_id=user_id, links=[], skills=[])
        db.add(profile)
        await db.flush()
    return profile


async def _load_with_user(
    db: AsyncSession, user_id: int
) -> tuple[UserProfile, User, Department | None]:
    profile = await _get_or_create_profile(db, user_id)

    user_res = await db.execute(
        select(User)
        .options(selectinload(User.department))
        .where(User.id == user_id)
    )
    user = user_res.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return profile, user, user.department


async def _serialize(
    profile: UserProfile, user: User, dept: Department | None
) -> UserProfileOut:
    avatar = await storage_service.resolve_url_async(
        profile.avatar_url,
        ttl_seconds=storage_service.PROFILE_SIGNED_URL_TTL_SECONDS,
    )
    cover = await storage_service.resolve_url_async(
        profile.cover_url,
        ttl_seconds=storage_service.PROFILE_SIGNED_URL_TTL_SECONDS,
    )
    return UserProfileOut(
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        department_id=user.department_id,
        department_name=dept.name if dept else None,
        avatar_url=avatar,
        cover_url=cover,
        bio=profile.bio,
        headline=profile.headline,
        links=profile.links or [],
        skills=profile.skills or [],
        designation=profile.designation,
        qualifications=profile.qualifications,
        achievements=profile.achievements,
        is_public=profile.is_public,
        updated_at=profile.updated_at,
    )


@router.get("/me", response_model=UserProfileOut)
async def get_me(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserProfileOut:
    profile, u, dept = await _load_with_user(db, user.id)
    await db.commit()
    return await _serialize(profile, u, dept)


@router.patch("/me", response_model=UserProfileOut)
async def update_me(
    body: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserProfileOut:
    profile, u, dept = await _load_with_user(db, user.id)

    data = body.model_dump(exclude_unset=True)

    # Faculty-only fields cannot be set by non-faculty.
    faculty_only = {"designation", "qualifications", "achievements"}
    if user.role != UserRole.faculty:
        for key in faculty_only:
            data.pop(key, None)

    if "links" in data and data["links"] is not None:
        data["links"] = [
            link.model_dump() if hasattr(link, "model_dump") else link
            for link in data["links"]
        ]

    for key, value in data.items():
        setattr(profile, key, value)

    await db.commit()
    await db.refresh(profile)
    return await _serialize(profile, u, dept)


@router.post("/me/avatar", response_model=UserProfileOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserProfileOut:
    stored = await storage_service.upload_image(
        file,
        bucket=settings.SUPABASE_BUCKET_AVATARS,
        user_id=user.id,
        kind="avatar",
        max_bytes=storage_service.AVATAR_MAX_BYTES,
    )
    profile, u, dept = await _load_with_user(db, user.id)
    profile.avatar_url = stored.path
    await db.commit()
    await db.refresh(profile)
    return await _serialize(profile, u, dept)


@router.post("/me/cover", response_model=UserProfileOut)
async def upload_cover(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserProfileOut:
    stored = await storage_service.upload_image(
        file,
        bucket=settings.SUPABASE_BUCKET_AVATARS,
        user_id=user.id,
        kind="cover",
        max_bytes=storage_service.COVER_MAX_BYTES,
    )
    profile, u, dept = await _load_with_user(db, user.id)
    profile.cover_url = stored.path
    await db.commit()
    await db.refresh(profile)
    return await _serialize(profile, u, dept)


@router.get("/{user_id}", response_model=UserProfileOut)
async def get_public_profile(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
) -> UserProfileOut:
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    user_res = await db.execute(
        select(User)
        .options(selectinload(User.department))
        .where(User.id == user_id)
    )
    user = user_res.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=404, detail="User not found")

    is_owner = viewer is not None and viewer.id == user.id
    is_admin = viewer is not None and viewer.role == UserRole.admin

    is_enrolled_faculty = False
    if (
        viewer is not None
        and viewer.role == UserRole.faculty
        and not is_owner
    ):
        er = await db.execute(
            select(Enrollment.id)
            .join(Course, Course.id == Enrollment.course_id)
            .where(
                Course.faculty_id == viewer.id,
                Enrollment.student_id == user_id,
            )
            .limit(1)
        )
        is_enrolled_faculty = er.scalar_one_or_none() is not None

    if not (is_owner or is_admin or profile.is_public or is_enrolled_faculty):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This profile is private",
        )

    return await _serialize(profile, user, user.department)
