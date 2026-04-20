from __future__ import annotations

import csv
import io
import secrets
import string

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import hash_password, require_admin
from core.database import get_db
from models.tables import Department, User, UserRole
from schemas.requests import (
    StudentImportResult,
    StudentImportRow,
    UserBrief,
    UserOut,
    validate_role_email,
)


router = APIRouter(prefix="/users", tags=["users"])


def _generate_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


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


@router.post("/students/import", response_model=StudentImportResult)
async def import_students(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> StudentImportResult:
    """Bulk-create student accounts from a CSV file.

    CSV columns (header required): ``email,name,department_code,password``.
    ``department_code`` and ``password`` are optional. If ``password`` is empty,
    a 12-char random password is generated and returned in the response so the
    admin can share it with the student.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a .csv",
        )

    raw = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))
    if reader.fieldnames is None or "email" not in reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV must have header with at least an 'email' column",
        )

    # Pre-load departments by code for quick lookup.
    dept_res = await db.execute(select(Department))
    dept_by_code = {d.code: d for d in dept_res.scalars().all()}

    rows: list[StudentImportRow] = []
    created = 0
    skipped = 0

    for line_num, raw_row in enumerate(reader, start=2):  # 1 = header
        email = (raw_row.get("email") or "").strip()
        name = (raw_row.get("name") or "").strip() or email.split("@", 1)[0]
        dept_code = (raw_row.get("department_code") or "").strip().upper() or None
        provided_pw = (raw_row.get("password") or "").strip()

        if not email:
            rows.append(
                StudentImportRow(
                    line=line_num,
                    email=email,
                    status="error",
                    detail="Empty email",
                )
            )
            skipped += 1
            continue

        try:
            normalized_email = validate_role_email(email, UserRole.student)
        except ValueError as exc:
            rows.append(
                StudentImportRow(
                    line=line_num,
                    email=email,
                    status="error",
                    detail=str(exc),
                )
            )
            skipped += 1
            continue

        # Already exists?
        existing = (
            await db.execute(
                select(User.id).where(User.email == normalized_email)
            )
        ).scalar_one_or_none()
        if existing is not None:
            rows.append(
                StudentImportRow(
                    line=line_num,
                    email=normalized_email,
                    status="exists",
                    detail="Email already registered",
                )
            )
            skipped += 1
            continue

        dept = dept_by_code.get(dept_code) if dept_code else None
        if dept_code and dept is None:
            rows.append(
                StudentImportRow(
                    line=line_num,
                    email=normalized_email,
                    status="error",
                    detail=f"Unknown department_code '{dept_code}'",
                )
            )
            skipped += 1
            continue

        password = provided_pw or _generate_password()
        user = User(
            email=normalized_email,
            password_hash=hash_password(password),
            role=UserRole.student,
            name=name,
            department_id=dept.id if dept else None,
            is_active=True,
        )
        db.add(user)
        try:
            await db.flush()
        except IntegrityError:
            await db.rollback()
            rows.append(
                StudentImportRow(
                    line=line_num,
                    email=normalized_email,
                    status="error",
                    detail="DB conflict (race)",
                )
            )
            skipped += 1
            continue

        rows.append(
            StudentImportRow(
                line=line_num,
                email=normalized_email,
                status="created",
                # Only return the password when we generated it; if the admin
                # supplied one, they already have it.
                generated_password=None if provided_pw else password,
            )
        )
        created += 1

    await db.commit()
    return StudentImportResult(
        total=len(rows),
        created=created,
        skipped=skipped,
        rows=rows,
    )
