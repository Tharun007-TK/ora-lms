from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.auth import get_current_user, require_admin
from core.config import settings
from core.database import get_db
from models.tables import (
    CollegeInfo,
    Department,
    FacultyProfile,
    User,
    UserRole,
)
from schemas.requests import (
    CollegeInfoOut,
    CollegeInfoUpdate,
    DepartmentCreate,
    DepartmentOut,
    DepartmentUpdate,
    FacultyProfileOut,
    FacultyProfileUpdate,
    MessageResponse,
)
from services import storage_service


router = APIRouter(prefix="/college", tags=["college"])


# ---------- Helpers ----------


def _serialize_profile(p: FacultyProfile, user: User, dept: Department | None) -> FacultyProfileOut:
    return FacultyProfileOut(
        id=p.id,
        user_id=p.user_id,
        name=user.name,
        email=user.email,
        department_id=p.department_id,
        department_name=dept.name if dept else None,
        designation=p.designation,
        qualifications=p.qualifications,
        achievements=p.achievements,
        photo_url=storage_service.resolve_url(p.photo_url),
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


# ---------- Departments (public list; admin writes) ----------


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
        select(FacultyProfile)
        .options(selectinload(FacultyProfile.user))
        .where(FacultyProfile.department_id == department_id)
    )
    profiles = result.scalars().all()
    return [_serialize_profile(p, p.user, dept) for p in profiles if p.user.is_active]


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


# ---------- Faculty profiles (public read) ----------


@router.get("/faculty", response_model=list[FacultyProfileOut])
async def list_faculty(db: AsyncSession = Depends(get_db)) -> list[FacultyProfileOut]:
    result = await db.execute(
        select(FacultyProfile).options(
            selectinload(FacultyProfile.user),
            selectinload(FacultyProfile.department),
        )
    )
    profiles = result.scalars().all()
    return [
        _serialize_profile(p, p.user, p.department) for p in profiles if p.user.is_active
    ]


@router.get("/faculty/{faculty_id}", response_model=FacultyProfileOut)
async def get_faculty(
    faculty_id: int, db: AsyncSession = Depends(get_db)
) -> FacultyProfileOut:
    result = await db.execute(
        select(FacultyProfile)
        .options(
            selectinload(FacultyProfile.user),
            selectinload(FacultyProfile.department),
        )
        .where(FacultyProfile.id == faculty_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None or not profile.user.is_active:
        raise HTTPException(status_code=404, detail="Faculty not found")
    return _serialize_profile(profile, profile.user, profile.department)


@router.put("/faculty/me", response_model=FacultyProfileOut)
async def upsert_my_profile(
    designation: str | None = Form(default=None, max_length=200),
    qualifications: str | None = Form(default=None),
    achievements: str | None = Form(default=None),
    department_id: int | None = Form(default=None),
    photo: UploadFile | None = File(default=None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FacultyProfileOut:
    if user.role != UserRole.faculty:
        raise HTTPException(status_code=403, detail="Only faculty can set a profile")

    result = await db.execute(
        select(FacultyProfile)
        .options(selectinload(FacultyProfile.department))
        .where(FacultyProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    photo_path: str | None = None
    if photo is not None and photo.filename:
        stored = await storage_service.upload_file(
            photo, bucket=settings.SUPABASE_BUCKET_LIBRARY, prefix="faculty"
        )
        photo_path = stored.path

    dept_id = department_id if department_id is not None else (profile.department_id if profile else user.department_id)

    if profile is None:
        profile = FacultyProfile(
            user_id=user.id,
            designation=designation,
            qualifications=qualifications,
            achievements=achievements,
            photo_url=photo_path,
            department_id=dept_id,
        )
        db.add(profile)
    else:
        if designation is not None:
            profile.designation = designation
        if qualifications is not None:
            profile.qualifications = qualifications
        if achievements is not None:
            profile.achievements = achievements
        if photo_path is not None:
            profile.photo_url = photo_path
        if department_id is not None:
            profile.department_id = department_id

    await db.commit()
    await db.refresh(profile)

    dept = None
    if profile.department_id is not None:
        dept_res = await db.execute(
            select(Department).where(Department.id == profile.department_id)
        )
        dept = dept_res.scalar_one_or_none()

    return _serialize_profile(profile, user, dept)


@router.patch("/faculty/{faculty_id}", response_model=FacultyProfileOut)
async def admin_update_faculty(
    faculty_id: int,
    body: FacultyProfileUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> FacultyProfileOut:
    result = await db.execute(
        select(FacultyProfile)
        .options(
            selectinload(FacultyProfile.user),
            selectinload(FacultyProfile.department),
        )
        .where(FacultyProfile.id == faculty_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Faculty not found")

    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(profile, k, v)
    await db.commit()
    await db.refresh(profile)

    dept = profile.department
    if "department_id" in data and profile.department_id is not None:
        dept_res = await db.execute(
            select(Department).where(Department.id == profile.department_id)
        )
        dept = dept_res.scalar_one_or_none()

    return _serialize_profile(profile, profile.user, dept)
