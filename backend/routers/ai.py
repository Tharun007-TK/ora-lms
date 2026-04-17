from __future__ import annotations

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user, require_faculty_or_admin
from core.config import settings
from core.database import get_db
from models.tables import Course, Enrollment, Note, User, UserRole
from schemas.requests import NoteOut
from services import ai_service, storage_service


router = APIRouter(prefix="/ai", tags=["ai"])


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


@router.post(
    "/generate-notes",
    response_model=NoteOut,
    status_code=status.HTTP_201_CREATED,
)
async def generate_notes(
    background: BackgroundTasks,
    course_id: int = Form(..., ge=1),
    title: str = Form(..., min_length=1, max_length=255),
    keep_pdf: bool = Form(default=True),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> NoteOut:
    # Course ownership
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    if user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    if not file.filename:
        raise HTTPException(status_code=400, detail="PDF file is required")

    content_type = (file.content_type or "").lower()
    if content_type and "pdf" not in content_type and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Generate Markdown via Groq (raises HTTPException on failure)
    generated = await ai_service.generate_notes_from_pdf(pdf_bytes)

    # Optionally keep the source PDF alongside the note
    file_path: str | None = None
    if keep_pdf:
        await file.seek(0)
        stored = await storage_service.upload_file(
            file,
            bucket=settings.SUPABASE_BUCKET_NOTES,
            prefix=f"course-{course_id}/ai",
        )
        file_path = stored.path

    note = Note(
        course_id=course_id,
        title=title,
        content=generated.content,
        file_url=file_path,
        ai_generated=True,
        created_by=user.id,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    # Embed in the background so the response is not blocked on OpenAI.
    background.add_task(ai_service.embed_note, note.id)

    return _serialize(note)


@router.get("/chat")
async def chat_stream(
    course_id: int = Query(..., ge=1),
    question: str = Query(..., min_length=1, max_length=2000),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    # Course access — admins ok, faculty must own, students must be enrolled.
    course = (
        await db.execute(select(Course).where(Course.id == course_id))
    ).scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    if user.role == UserRole.faculty and course.faculty_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")
    if user.role == UserRole.student:
        enrolled = (
            await db.execute(
                select(Enrollment.id).where(
                    Enrollment.course_id == course_id,
                    Enrollment.student_id == user.id,
                )
            )
        ).scalar_one_or_none()
        if enrolled is None:
            raise HTTPException(
                status_code=403, detail="You are not enrolled in this course"
            )

    stream = ai_service.stream_rag_answer(course_id=course_id, question=question)
    headers = {
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    }
    return StreamingResponse(stream, media_type="text/event-stream", headers=headers)
