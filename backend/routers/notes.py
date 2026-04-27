from __future__ import annotations

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user, require_faculty_or_admin
from core.config import settings
from core.database import get_db
from models.tables import Course, Enrollment, Note, User, UserRole
from schemas.requests import MessageResponse, NoteOut
from services import ai_service, notification_service, storage_service


router = APIRouter(prefix="/courses/{course_id}/notes", tags=["notes"])


async def _get_course_or_404(db: AsyncSession, course_id: int) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


async def _ensure_course_access(db: AsyncSession, course: Course, user: User) -> None:
    if user.role == UserRole.admin:
        return
    if user.role == UserRole.faculty:
        if course.faculty_id != user.id:
            raise HTTPException(status_code=403, detail="Not your course")
        return
    # student — must be enrolled
    er = await db.execute(
        select(Enrollment.id).where(
            Enrollment.course_id == course.id, Enrollment.student_id == user.id
        )
    )
    if er.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="You are not enrolled in this course")


def _serialize(note: Note) -> NoteOut:
    return NoteOut(
        id=note.id,
        course_id=note.course_id,
        title=note.title,
        content=note.content,
        file_url=storage_service.resolve_url(note.file_url),
        ai_generated=note.ai_generated,
        created_by=note.created_by,
        created_at=note.created_at,
    )


@router.get("", response_model=list[NoteOut])
async def list_notes(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[NoteOut]:
    course = await _get_course_or_404(db, course_id)
    await _ensure_course_access(db, course, user)

    result = await db.execute(
        select(Note).where(Note.course_id == course_id).order_by(Note.created_at.desc())
    )
    return [_serialize(n) for n in result.scalars().all()]


@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    course_id: int,
    background: BackgroundTasks,
    title: str = Form(..., min_length=1, max_length=255),
    content: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> NoteOut:
    course = await _get_course_or_404(db, course_id)
    if user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    file_path: str | None = None
    if file is not None and file.filename:
        stored = await storage_service.upload_file(
            file,
            bucket=settings.SUPABASE_BUCKET_NOTES,
            prefix=f"course-{course_id}",
        )
        file_path = stored.path

    if not content and not file_path:
        raise HTTPException(
            status_code=400, detail="Provide note content, a file, or both"
        )

    note = Note(
        course_id=course_id,
        title=title,
        content=content,
        file_url=file_path,
        ai_generated=False,
        created_by=user.id,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    if note.content:
        background.add_task(ai_service.embed_note, note.id)

    # Notify all enrolled students about the new note.
    enrolled = await db.execute(
        select(Enrollment.student_id).where(Enrollment.course_id == course_id)
    )
    student_ids = [int(r[0]) for r in enrolled.all()]
    if student_ids:
        await notification_service.notify(
            db,
            user_ids=student_ids,
            title=f"New note: {note.title}",
            body=f"Posted in {course.title}",
            link=f"/student/courses/{course_id}/notes",
        )

    return _serialize(note)


@router.get("/{note_id}", response_model=NoteOut)
async def get_note(
    course_id: int,
    note_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> NoteOut:
    course = await _get_course_or_404(db, course_id)
    await _ensure_course_access(db, course, user)

    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.course_id == course_id)
    )
    note = result.scalar_one_or_none()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return _serialize(note)


@router.delete("/{note_id}", response_model=MessageResponse)
async def delete_note(
    course_id: int,
    note_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> MessageResponse:
    course = await _get_course_or_404(db, course_id)
    if user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.course_id == course_id)
    )
    note = result.scalar_one_or_none()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    await db.delete(note)
    await db.commit()
    return MessageResponse(detail="Note deleted")
