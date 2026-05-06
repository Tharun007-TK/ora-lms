from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user, require_faculty_or_admin
from core.config import settings
from core.database import get_db
from models.tables import LibraryBook, User, UserRole
from schemas.requests import LibraryBookOut, LibraryBookUpdate, MessageResponse
from services import storage_service


router = APIRouter(prefix="/library", tags=["library"])


async def _serialize(book: LibraryBook) -> LibraryBookOut:
    return LibraryBookOut(
        id=book.id,
        title=book.title,
        author=book.author,
        category=book.category,
        file_url=await storage_service.resolve_url_async(book.file_url),
        cover_url=await storage_service.resolve_url_async(book.cover_url),
        uploaded_by=book.uploaded_by,
        created_at=book.created_at,
    )


@router.get("", response_model=list[LibraryBookOut])
async def list_books(
    category: str | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[LibraryBookOut]:
    stmt = select(LibraryBook)
    if category:
        stmt = stmt.where(LibraryBook.category == category)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(LibraryBook.title.ilike(like), LibraryBook.author.ilike(like)))
    stmt = stmt.order_by(LibraryBook.created_at.desc())
    result = await db.execute(stmt)
    return [await _serialize(b) for b in result.scalars().all()]


@router.get("/categories", response_model=list[str])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[str]:
    result = await db.execute(
        select(LibraryBook.category)
        .where(LibraryBook.category.is_not(None))
        .group_by(LibraryBook.category)
        .order_by(func.lower(LibraryBook.category))
    )
    return [row[0] for row in result.all() if row[0]]


@router.get("/{book_id}", response_model=LibraryBookOut)
async def get_book(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> LibraryBookOut:
    result = await db.execute(select(LibraryBook).where(LibraryBook.id == book_id))
    book = result.scalar_one_or_none()
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return await _serialize(book)


@router.post("", response_model=LibraryBookOut, status_code=status.HTTP_201_CREATED)
async def create_book(
    title: str = Form(..., min_length=1, max_length=255),
    author: str = Form(..., min_length=1, max_length=255),
    category: str | None = Form(default=None, max_length=100),
    file: UploadFile | None = File(default=None),
    cover: UploadFile | None = File(default=None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> LibraryBookOut:
    if file is None or not file.filename:
        raise HTTPException(status_code=400, detail="Book PDF is required")

    stored = await storage_service.upload_file(
        file, bucket=settings.SUPABASE_BUCKET_LIBRARY, prefix="books"
    )
    cover_path: str | None = None
    if cover is not None and cover.filename:
        stored_cover = await storage_service.upload_file(
            cover, bucket=settings.SUPABASE_BUCKET_LIBRARY, prefix="covers"
        )
        cover_path = stored_cover.path

    book = LibraryBook(
        title=title,
        author=author,
        category=(category or None),
        file_url=stored.path,
        cover_url=cover_path,
        uploaded_by=user.id,
    )
    db.add(book)
    await db.commit()
    await db.refresh(book)
    return await _serialize(book)


@router.patch("/{book_id}", response_model=LibraryBookOut)
async def update_book(
    book_id: int,
    body: LibraryBookUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> LibraryBookOut:
    result = await db.execute(select(LibraryBook).where(LibraryBook.id == book_id))
    book = result.scalar_one_or_none()
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    if user.role == UserRole.faculty and book.uploaded_by != user.id:
        raise HTTPException(status_code=403, detail="Not your upload")

    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(book, k, v)
    await db.commit()
    await db.refresh(book)
    return await _serialize(book)


@router.delete("/{book_id}", response_model=MessageResponse)
async def delete_book(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_faculty_or_admin),
) -> MessageResponse:
    result = await db.execute(select(LibraryBook).where(LibraryBook.id == book_id))
    book = result.scalar_one_or_none()
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    if user.role == UserRole.faculty and book.uploaded_by != user.id:
        raise HTTPException(status_code=403, detail="Not your upload")

    await db.delete(book)
    await db.commit()
    return MessageResponse(detail="Book deleted")
