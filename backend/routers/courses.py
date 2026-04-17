from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.auth import get_current_user, require_admin, require_faculty_or_admin
from core.database import get_db
from models.tables import Course, Enrollment, User, UserRole
from schemas.requests import (
    CourseCreate,
    CourseOut,
    CourseUpdate,
    EnrollRequest,
    MessageResponse,
    UserBrief,
)

router = APIRouter(prefix="/courses", tags=["courses"])


async def _get_course_or_404(db: AsyncSession, course_id: int) -> Course:
    result = await db.execute(
        select(Course)
        .options(selectinload(Course.faculty))
        .where(Course.id == course_id)
    )
    course = result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def _serialize(
    course: Course,
    *,
    enrolled: bool | None = None,
    enrollment_count: int | None = None,
) -> CourseOut:
    return CourseOut(
        id=course.id,
        title=course.title,
        code=course.code,
        description=course.description,
        department_id=course.department_id,
        faculty_id=course.faculty_id,
        faculty_name=course.faculty.name if course.faculty else None,
        semester=course.semester,
        created_at=course.created_at,
        enrolled=enrolled,
        enrollment_count=enrollment_count,
    )


@router.get("", response_model=list[CourseOut])
async def list_courses(
    mine: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CourseOut]:
    stmt = select(Course).options(selectinload(Course.faculty)).order_by(Course.created_at.desc())

    if user.role == UserRole.student:
        if mine:
            stmt = stmt.join(Enrollment, Enrollment.course_id == Course.id).where(
                Enrollment.student_id == user.id
            )
        # Students otherwise see all courses so they can self-enroll.
    elif user.role == UserRole.faculty and mine:
        stmt = stmt.where(Course.faculty_id == user.id)

    result = await db.execute(stmt)
    courses = result.scalars().unique().all()

    # Enrollment info for students
    enrolled_ids: set[int] = set()
    if user.role == UserRole.student:
        er = await db.execute(
            select(Enrollment.course_id).where(Enrollment.student_id == user.id)
        )
        enrolled_ids = {row[0] for row in er.all()}

    # Enrollment counts (admin + faculty)
    counts: dict[int, int] = {}
    if user.role in (UserRole.admin, UserRole.faculty):
        ids = [c.id for c in courses]
        if ids:
            cr = await db.execute(
                select(Enrollment.course_id, func.count(Enrollment.id))
                .where(Enrollment.course_id.in_(ids))
                .group_by(Enrollment.course_id)
            )
            counts = {cid: n for cid, n in cr.all()}

    return [
        _serialize(
            c,
            enrolled=(c.id in enrolled_ids) if user.role == UserRole.student else None,
            enrollment_count=counts.get(c.id),
        )
        for c in courses
    ]


@router.get("/{course_id}", response_model=CourseOut)
async def get_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CourseOut:
    course = await _get_course_or_404(db, course_id)
    enrolled: bool | None = None
    enrollment_count: int | None = None
    if user.role == UserRole.student:
        er = await db.execute(
            select(Enrollment.id).where(
                Enrollment.course_id == course_id, Enrollment.student_id == user.id
            )
        )
        enrolled = er.scalar_one_or_none() is not None
    else:
        cr = await db.execute(
            select(func.count(Enrollment.id)).where(Enrollment.course_id == course_id)
        )
        enrollment_count = cr.scalar_one()
    return _serialize(course, enrolled=enrolled, enrollment_count=enrollment_count)


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> CourseOut:
    faculty_id = payload.faculty_id or (user.id if user.role == UserRole.faculty else None)
    if faculty_id is not None:
        fr = await db.execute(
            select(User).where(User.id == faculty_id, User.role == UserRole.faculty)
        )
        if fr.scalar_one_or_none() is None:
            raise HTTPException(status_code=400, detail="faculty_id must reference a faculty user")

    course = Course(
        title=payload.title,
        code=payload.code.upper(),
        description=payload.description,
        department_id=payload.department_id,
        faculty_id=faculty_id,
        semester=payload.semester,
    )
    db.add(course)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Course code already exists")
    await db.refresh(course, attribute_names=["faculty"])
    return _serialize(course, enrollment_count=0)


@router.patch("/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> CourseOut:
    course = await _get_course_or_404(db, course_id)

    # Faculty may only edit their own course; and cannot reassign faculty.
    if user.role == UserRole.faculty:
        if course.faculty_id != user.id:
            raise HTTPException(status_code=403, detail="Not your course")
        if payload.faculty_id is not None and payload.faculty_id != user.id:
            raise HTTPException(status_code=403, detail="Faculty cannot reassign courses")

    data = payload.model_dump(exclude_unset=True)
    if "faculty_id" in data and data["faculty_id"] is not None:
        fr = await db.execute(
            select(User).where(User.id == data["faculty_id"], User.role == UserRole.faculty)
        )
        if fr.scalar_one_or_none() is None:
            raise HTTPException(status_code=400, detail="faculty_id must reference a faculty user")
    for k, v in data.items():
        setattr(course, k, v)

    await db.commit()
    await db.refresh(course, attribute_names=["faculty"])
    return _serialize(course)


@router.delete("/{course_id}", response_model=MessageResponse)
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> MessageResponse:
    course = await _get_course_or_404(db, course_id)
    await db.delete(course)
    await db.commit()
    return MessageResponse(detail="Course deleted")


# ---------- Enrollments ----------


@router.post("/{course_id}/enroll", response_model=MessageResponse)
async def enroll(
    course_id: int,
    payload: EnrollRequest | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageResponse:
    await _get_course_or_404(db, course_id)

    target_id: int
    if user.role == UserRole.student:
        if payload and payload.student_id and payload.student_id != user.id:
            raise HTTPException(status_code=403, detail="Students can only enroll themselves")
        target_id = user.id
    else:
        if not payload or not payload.student_id:
            raise HTTPException(status_code=400, detail="student_id is required")
        sr = await db.execute(
            select(User).where(User.id == payload.student_id, User.role == UserRole.student)
        )
        if sr.scalar_one_or_none() is None:
            raise HTTPException(status_code=400, detail="student_id must reference a student")
        target_id = payload.student_id

    enrollment = Enrollment(student_id=target_id, course_id=course_id)
    db.add(enrollment)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Already enrolled")
    return MessageResponse(detail="Enrolled")


@router.delete("/{course_id}/enroll", response_model=MessageResponse)
async def unenroll(
    course_id: int,
    student_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageResponse:
    target_id = user.id if user.role == UserRole.student else student_id
    if target_id is None:
        raise HTTPException(status_code=400, detail="student_id is required")

    if user.role == UserRole.student and student_id and student_id != user.id:
        raise HTTPException(status_code=403, detail="Students can only unenroll themselves")

    result = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course_id, Enrollment.student_id == target_id
        )
    )
    enrollment = result.scalar_one_or_none()
    if enrollment is None:
        raise HTTPException(status_code=404, detail="Not enrolled")
    await db.delete(enrollment)
    await db.commit()
    return MessageResponse(detail="Unenrolled")


@router.get("/{course_id}/students", response_model=list[UserBrief])
async def list_course_students(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> list[UserBrief]:
    course = await _get_course_or_404(db, course_id)
    if user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    result = await db.execute(
        select(User)
        .join(Enrollment, Enrollment.student_id == User.id)
        .where(Enrollment.course_id == course_id)
        .order_by(User.name)
    )
    return [UserBrief.model_validate(u) for u in result.scalars().all()]
