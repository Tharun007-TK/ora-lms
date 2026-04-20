from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.auth import require_admin
from core.database import get_db
from models.tables import (
    CollegeInfo,
    Department,
    User,
    UserProfile,
    UserRole,
)
from schemas.requests import (
    CollegeInfoOut,
    CollegeInfoUpdate,
    DepartmentCreate,
    DepartmentOut,
    DepartmentUpdate,
    FacultyProfileOut,
    MessageResponse,
)
from services import storage_service


router = APIRouter(prefix="/college", tags=["college"])


def _serialize_faculty(
    user: User, profile: UserProfile | None, dept: Department | None
) -> FacultyProfileOut:
    return FacultyProfileOut(
        id=user.id,
        user_id=user.id,
        name=user.name,
        email=user.email,
        department_id=user.department_id,
        department_name=dept.name if dept else None,
        designation=profile.designation if profile else None,
        qualifications=profile.qualifications if profile else None,
        achievements=profile.achievements if profile else None,
        photo_url=storage_service.resolve_url(
            profile.avatar_url if profile else None,
            ttl_seconds=storage_service.PROFILE_SIGNED_URL_TTL_SECONDS,
        ),
    )


# ---------- College info (public) ----------


@router.get("/info", response_model=CollegeInfoOut)
async def get_info(db: AsyncSession = Depends(get_db)) -> CollegeInfoOut:
    result = await db.execute(select(CollegeInfo).order_by(CollegeInfo.id.asc()).limit(1))
    info = result.scalar_one_or_none()
    if info is None:
        raise HTTPException(status_code=404, detail="College info not set")
    return CollegeInfoOut.model_validate(info)


@router.put("/info", response_model=CollegeInfoOut)
async def upsert_info(
    body: CollegeInfoUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> CollegeInfoOut:
    result = await db.execute(select(CollegeInfo).order_by(CollegeInfo.id.asc()).limit(1))
    info = result.scalar_one_or_none()
    data = body.model_dump(exclude_unset=True)

    if info is None:
        info = CollegeInfo(**data)
        db.add(info)
    else:
        for k, v in data.items():
            setattr(info, k, v)

    await db.commit()
    await db.refresh(info)
    return CollegeInfoOut.model_validate(info)


# ---------- Departments ----------


@router.get("/departments", response_model=list[DepartmentOut])
async def list_departments(db: AsyncSession = Depends(get_db)) -> list[DepartmentOut]:
    result = await db.execute(select(Department).order_by(Department.name))
    return [DepartmentOut.model_validate(d) for d in result.scalars().all()]


@router.get("/departments/{department_id}", response_model=DepartmentOut)
async def get_department(
    department_id: int, db: AsyncSession = Depends(get_db)
) -> DepartmentOut:
    result = await db.execute(select(Department).where(Department.id == department_id))
    dept = result.scalar_one_or_none()
    if dept is None:
        raise HTTPException(status_code=404, detail="Department not found")
    return DepartmentOut.model_validate(dept)


@router.get("/departments/{department_id}/faculty", response_model=list[FacultyProfileOut])
async def list_department_faculty(
    department_id: int, db: AsyncSession = Depends(get_db)
) -> list[FacultyProfileOut]:
    dept_res = await db.execute(select(Department).where(Department.id == department_id))
    dept = dept_res.scalar_one_or_none()
    if dept is None:
        raise HTTPException(status_code=404, detail="Department not found")

    result = await db.execute(
        select(User, UserProfile)
        .outerjoin(UserProfile, UserProfile.user_id == User.id)
        .where(
            User.role == UserRole.faculty,
            User.is_active.is_(True),
            User.department_id == department_id,
        )
        .order_by(User.name)
    )
    rows = result.all()
    return [_serialize_faculty(user, profile, dept) for user, profile in rows]


@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
async def create_department(
    body: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> DepartmentOut:
    exists = await db.execute(
        select(Department.id).where(
            (Department.code == body.code) | (Department.name == body.name)
        )
    )
    if exists.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Department with that name or code exists")

    dept = Department(**body.model_dump())
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return DepartmentOut.model_validate(dept)


@router.patch("/departments/{department_id}", response_model=DepartmentOut)
async def update_department(
    department_id: int,
    body: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> DepartmentOut:
    result = await db.execute(select(Department).where(Department.id == department_id))
    dept = result.scalar_one_or_none()
    if dept is None:
        raise HTTPException(status_code=404, detail="Department not found")

    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(dept, k, v)
    await db.commit()
    await db.refresh(dept)
    return DepartmentOut.model_validate(dept)


@router.delete("/departments/{department_id}", response_model=MessageResponse)
async def delete_department(
    department_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> MessageResponse:
    result = await db.execute(select(Department).where(Department.id == department_id))
    dept = result.scalar_one_or_none()
    if dept is None:
        raise HTTPException(status_code=404, detail="Department not found")
    await db.delete(dept)
    await db.commit()
    return MessageResponse(detail="Department deleted")


# ---------- Faculty profiles (public read, sourced from user_profiles) ----------


@router.get("/faculty", response_model=list[FacultyProfileOut])
async def list_faculty(db: AsyncSession = Depends(get_db)) -> list[FacultyProfileOut]:
    result = await db.execute(
        select(User, UserProfile, Department)
        .outerjoin(UserProfile, UserProfile.user_id == User.id)
        .outerjoin(Department, Department.id == User.department_id)
        .where(User.role == UserRole.faculty, User.is_active.is_(True))
        .order_by(User.name)
    )
    rows = result.all()
    return [_serialize_faculty(user, profile, dept) for user, profile, dept in rows]


@router.get("/faculty/{faculty_id}", response_model=FacultyProfileOut)
async def get_faculty(
    faculty_id: int, db: AsyncSession = Depends(get_db)
) -> FacultyProfileOut:
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.department),
            selectinload(User.profile),
        )
        .where(User.id == faculty_id, User.role == UserRole.faculty)
    )
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=404, detail="Faculty not found")
    return _serialize_faculty(user, user.profile, user.department)
