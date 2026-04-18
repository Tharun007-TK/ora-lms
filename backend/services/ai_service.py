"""AI generation services — Claude notes maker + RAG retrieval + Claude stream."""
from __future__ import annotations

import asyncio
import json
import logging
import re
from dataclasses import dataclass
from typing import AsyncIterator

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import SessionLocal
from models.tables import Note, NoteEmbedding


log = logging.getLogger(__name__)


# ---------- PDF extraction ----------


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract plain text from a PDF using PyMuPDF.

    Raises 400 if the payload is not a valid PDF or has no extractable text.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError as exc:  # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PyMuPDF not installed on the server",
        ) from exc

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is not a readable PDF",
        ) from exc

    try:
        pages: list[str] = []
        for page in doc:
            pages.append(page.get_text("text") or "")
    finally:
        doc.close()

    text = "\n\n".join(p.strip() for p in pages if p and p.strip())
    if not text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No extractable text in PDF (is it a scanned image?)",
        )
    return text


# ---------- Chunking ----------


_PARAGRAPH_RE = re.compile(r"\n\s*\n+")


def chunk_text(text: str, *, max_chars: int = 8000) -> list[str]:
    """Split text into paragraph-aware chunks bounded by ``max_chars``."""
    paragraphs = _PARAGRAPH_RE.split(text)
    chunks: list[str] = []
    cur: list[str] = []
    cur_len = 0
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        if cur and cur_len + len(p) + 2 > max_chars:
            chunks.append("\n\n".join(cur))
            cur = [p]
            cur_len = len(p)
        else:
            cur.append(p)
            cur_len += len(p) + 2
    if cur:
        chunks.append("\n\n".join(cur))
    return chunks


# ---------- Claude call (AI Notes Maker) ----------


_SYSTEM_PROMPT = (
    "You are Ora, a college study-notes assistant. Convert the raw textbook or "
    "lecture content into clean, structured student notes in GitHub-flavoured "
    "Markdown. Requirements:\n"
    "- Use `##` section headings and `###` sub-sections where natural.\n"
    "- Convert prose into concise bullet points; keep explanations crisp.\n"
    "- Highlight **key definitions** in bold and place important formulas in "
    "LaTeX-style fenced blocks.\n"
    "- Preserve examples as fenced code blocks or indented examples.\n"
    "- Do NOT add front-matter, preambles, or 'Sure, here are your notes'. "
    "Output notes only.\n"
    "- If the chunk is a continuation, continue naturally without repeating "
    "the chapter title."
)


@dataclass(frozen=True)
class GeneratedNotes:
    content: str
    chunk_count: int
    char_count: int


def _anthropic_client():
    try:
        from anthropic import AsyncAnthropic  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="anthropic SDK not installed on the server",
        ) from exc
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ANTHROPIC_API_KEY is not configured",
        )
    return AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


def _extract_text(message) -> str:
    parts: list[str] = []
    for block in getattr(message, "content", []) or []:
        text = getattr(block, "text", None)
        if isinstance(text, str):
            parts.append(text)
    return "".join(parts).strip()


async def _structure_chunk(client, chunk: str, *, index: int, total: int) -> str:
    prefix = f"(Chunk {index + 1} of {total})\n\n" if total > 1 else ""
    try:
        message = await client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            temperature=0.2,
            max_tokens=2048,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"{prefix}{chunk}"}],
        )
    except Exception as exc:
        log.exception("Anthropic notes call failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Claude request failed: {exc}",
        ) from exc

    return _extract_text(message)


async def generate_notes_from_pdf(file_bytes: bytes, *, max_chunks: int = 6) -> GeneratedNotes:
    """Extract PDF text, run Claude over each chunk, and return joined Markdown."""
    text = extract_pdf_text(file_bytes)
    chunks = chunk_text(text)
    if len(chunks) > max_chunks:
        log.info(
            "Truncating PDF from %d to %d chunks to stay under demo budget",
            len(chunks),
            max_chunks,
        )
        chunks = chunks[:max_chunks]

    client = _anthropic_client()
    total = len(chunks)
    sections = await asyncio.gather(
        *(_structure_chunk(client, c, index=i, total=total) for i, c in enumerate(chunks))
    )
    body = "\n\n---\n\n".join(s for s in sections if s)
    if not body.strip():
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Claude returned an empty response",
        )
    return GeneratedNotes(content=body, chunk_count=total, char_count=len(body))


# ---------- Embeddings (OpenAI text-embedding-3-small, 1536 dims) ----------


def _embed_chunks(text: str, *, max_chars: int = 1200) -> list[str]:
    """Smaller chunks than notes generation — tuned for retrieval recall."""
    return chunk_text(text, max_chars=max_chars)


async def _openai_client():
    try:
        from openai import AsyncOpenAI  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("openai SDK not installed") from exc
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not configured")
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def _embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    client = await _openai_client()
    res = await client.embeddings.create(
        model=settings.OPENAI_EMBED_MODEL,
        input=texts,
    )
    return [d.embedding for d in res.data]


async def embed_note(note_id: int) -> int:
    """Background task: chunk + embed + upsert into ``note_embeddings``.

    Returns the number of chunks indexed. Swallows errors so a failed embed
    never crashes the request that scheduled it; logs instead.
    """
    try:
        async with SessionLocal() as db:
            note = (
                await db.execute(select(Note).where(Note.id == note_id))
            ).scalar_one_or_none()
            if note is None:
                return 0
            # Prefer content; fall back to nothing if no text (file-only note).
            source = (note.content or "").strip()
            if not source:
                return 0

            chunks = _embed_chunks(source)
            if not chunks:
                return 0

            vectors = await _embed_texts(chunks)
            if len(vectors) != len(chunks):
                log.warning(
                    "Embedding dim mismatch for note %s: %d chunks, %d vectors",
                    note_id,
                    len(chunks),
                    len(vectors),
                )
                return 0

            # Replace any existing embeddings for this note.
            await db.execute(
                delete(NoteEmbedding).where(NoteEmbedding.note_id == note_id)
            )
            db.add_all(
                [
                    NoteEmbedding(note_id=note_id, chunk_text=c, embedding=v)
                    for c, v in zip(chunks, vectors)
                ]
            )
            await db.commit()
            return len(chunks)
    except Exception:
        log.exception("embed_note failed for note_id=%s", note_id)
        return 0


# ---------- RAG retrieval ----------


@dataclass(frozen=True)
class RetrievedChunk:
    note_id: int
    note_title: str
    chunk_text: str


async def retrieve_course_context(
    db: AsyncSession, *, course_id: int, question: str, k: int = 5
) -> list[RetrievedChunk]:
    """Embed the question and return top-k similar chunks for the course."""
    try:
        vectors = await _embed_texts([question])
    except RuntimeError as exc:
        log.warning("Embedding unavailable, skipping retrieval: %s", exc)
        return []

    if not vectors:
        return []
    qvec = vectors[0]

    stmt = (
        select(NoteEmbedding.note_id, Note.title, NoteEmbedding.chunk_text)
        .join(Note, Note.id == NoteEmbedding.note_id)
        .where(Note.course_id == course_id)
        .order_by(NoteEmbedding.embedding.cosine_distance(qvec))
        .limit(k)
    )
    rows = (await db.execute(stmt)).all()
    return [
        RetrievedChunk(note_id=r[0], note_title=r[1], chunk_text=r[2])
        for r in rows
    ]


# ---------- Claude streaming ----------


_RAG_SYSTEM_PROMPT = (
    "You are Ora AI, an academic assistant for MCET students. Answer using "
    "ONLY the provided course context when it is relevant. If the context "
    "does not cover the question, say so briefly and offer a general answer "
    "marked as such. Be concise, structured, and precise. Use Markdown: "
    "short paragraphs, bullet points, and fenced code blocks for formulas "
    "or code."
)


def _build_context_block(chunks: list[RetrievedChunk]) -> str:
    if not chunks:
        return "(No course-specific context was retrieved.)"
    parts: list[str] = []
    for i, c in enumerate(chunks, start=1):
        parts.append(f"[{i}] From note '{c.note_title}':\n{c.chunk_text}")
    return "\n\n".join(parts)


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


async def stream_rag_answer(
    *, course_id: int, question: str
) -> AsyncIterator[str]:
    """Yield Server-Sent Events: meta → token* → done (or error)."""
    # Retrieve in a fresh session so we don't hold the request's session open
    # while we stream.
    async with SessionLocal() as db:
        try:
            chunks = await retrieve_course_context(
                db, course_id=course_id, question=question
            )
        except Exception:
            log.exception("retrieval failed")
            chunks = []

    yield _sse(
        {
            "type": "meta",
            "sources": [
                {"note_id": c.note_id, "note_title": c.note_title}
                for c in chunks
            ],
        }
    )

    if not settings.ANTHROPIC_API_KEY:
        yield _sse(
            {
                "type": "error",
                "detail": "ANTHROPIC_API_KEY not configured",
            }
        )
        yield _sse({"type": "done"})
        return

    try:
        from anthropic import AsyncAnthropic  # type: ignore
    except ImportError:
        yield _sse({"type": "error", "detail": "anthropic SDK missing"})
        yield _sse({"type": "done"})
        return

    context_block = _build_context_block(chunks)
    user_message = (
        f"Course context:\n{context_block}\n\nStudent question: {question}"
    )

    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    try:
        async with client.messages.stream(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1024,
            system=_RAG_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            async for text in stream.text_stream:
                if text:
                    yield _sse({"type": "token", "text": text})
    except Exception as exc:
        log.exception("Anthropic stream failed")
        yield _sse({"type": "error", "detail": f"Claude stream failed: {exc}"})

    yield _sse({"type": "done"})
