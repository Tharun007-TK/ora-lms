"""AI generation services — Groq notes maker + RAG retrieval + Claude stream."""
from __future__ import annotations

import asyncio
import json
import logging
import re
from dataclasses import dataclass
from typing import AsyncIterator, Optional

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


def _groq_client():
    try:
        from groq import AsyncGroq  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="groq SDK not installed on the server",
        ) from exc
    if not settings.GROQ_API_KEY:
        return None
    return AsyncGroq(api_key=settings.GROQ_API_KEY)


def _extract_text(message) -> str:
    parts: list[str] = []
    for block in getattr(message, "content", []) or []:
        text = getattr(block, "text", None)
        if isinstance(text, str):
            parts.append(text)
    return "".join(parts).strip()


async def _structure_chunk_anthropic(client, chunk: str, *, index: int, total: int) -> str:
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


async def _structure_chunk_groq(client, chunk: str, *, index: int, total: int) -> str:
    prefix = f"(Chunk {index + 1} of {total})\n\n" if total > 1 else ""
    try:
        completion = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            temperature=0.2,
            max_tokens=2048,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": f"{prefix}{chunk}"},
            ],
        )
    except Exception as exc:
        log.exception("Groq notes call failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Groq request failed: {exc}",
        ) from exc

    try:
        return (completion.choices[0].message.content or "").strip()
    except (AttributeError, IndexError):
        return ""


async def generate_notes_from_pdf(file_bytes: bytes, *, max_chunks: int = 6) -> GeneratedNotes:
    """Extract PDF text, structure via Groq (fallback Anthropic), return Markdown."""
    text = extract_pdf_text(file_bytes)
    chunks = chunk_text(text)
    if len(chunks) > max_chunks:
        log.info(
            "Truncating PDF from %d to %d chunks to stay under demo budget",
            len(chunks),
            max_chunks,
        )
        chunks = chunks[:max_chunks]

    total = len(chunks)
    if total == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF produced no usable text",
        )

    groq = _groq_client()
    if groq is not None:
        provider = "groq"
        sections = await asyncio.gather(
            *(_structure_chunk_groq(groq, c, index=i, total=total) for i, c in enumerate(chunks))
        )
    elif settings.ANTHROPIC_API_KEY:
        provider = "anthropic"
        client = _anthropic_client()
        sections = await asyncio.gather(
            *(_structure_chunk_anthropic(client, c, index=i, total=total) for i, c in enumerate(chunks))
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No notes provider configured: set GROQ_API_KEY or ANTHROPIC_API_KEY",
        )

    body = "\n\n---\n\n".join(s for s in sections if s)
    if not body.strip():
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"{provider} returned an empty response",
        )
    return GeneratedNotes(content=body, chunk_count=total, char_count=len(body))


# ---------- Embeddings (HuggingFace BAAI/bge-small-en-v1.5, 384 dims) ----------


def _embed_chunks(text: str, *, max_chars: int = 1200) -> list[str]:
    """Smaller chunks than notes generation — tuned for retrieval recall."""
    return chunk_text(text, max_chars=max_chars)


# Module-level singleton: HuggingFaceEmbedding loads weights from disk on first
# init (~30-60s cold). Reuse the instance across requests so subsequent embeds
# are sub-100ms on CPU. The lock prevents concurrent first-call double-loads.
_hf_embedder = None
_hf_embedder_lock: Optional[asyncio.Lock] = None


async def _get_hf_embedder():
    global _hf_embedder, _hf_embedder_lock
    if _hf_embedder is not None:
        return _hf_embedder
    if _hf_embedder_lock is None:
        _hf_embedder_lock = asyncio.Lock()
    async with _hf_embedder_lock:
        if _hf_embedder is not None:
            return _hf_embedder
        try:
            from llama_index.embeddings.huggingface import HuggingFaceEmbedding  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError(
                "llama-index-embeddings-huggingface not installed"
            ) from exc
        log.info("Loading HF embedder %s", settings.HF_EMBED_MODEL)
        _hf_embedder = await asyncio.to_thread(
            HuggingFaceEmbedding,
            model_name=settings.HF_EMBED_MODEL,
        )
        return _hf_embedder


async def _embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    embedder = await _get_hf_embedder()
    # llama-index batch helper runs synchronously; offload to a worker thread
    # so the FastAPI event loop stays responsive during embedding.
    vectors = await asyncio.to_thread(
        embedder.get_text_embedding_batch, list(texts)
    )
    return [list(v) for v in vectors]


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


def _sse_ping() -> str:
    # SSE comment line — clients ignore it but it keeps the TCP socket alive
    # past Render's 30s idle timeout while retrieval/first token is pending.
    return ": keepalive\n\n"


async def stream_rag_answer(
    *, course_id: int, question: str
) -> AsyncIterator[str]:
    """Yield Server-Sent Events: meta → token* → done (or error)."""
    # Flush headers immediately so the client opens the SSE connection cleanly
    # before any potentially-slow upstream call (embedding, pgvector, Claude).
    yield _sse_ping()

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

    # Bridge the Anthropic stream through a queue so we can interleave
    # keepalive pings while we wait for the first (and subsequent) tokens.
    # Render free tier closes idle SSE connections at 30s — without pings,
    # a slow Claude warm-up will drop the response mid-flight.
    queue: asyncio.Queue[Optional[dict]] = asyncio.Queue()

    async def _producer() -> None:
        try:
            async with client.messages.stream(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=1024,
                system=_RAG_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            ) as stream:
                async for text in stream.text_stream:
                    if text:
                        await queue.put({"type": "token", "text": text})
        except Exception as exc:
            log.exception("Anthropic stream failed")
            await queue.put(
                {"type": "error", "detail": f"Claude stream failed: {exc}"}
            )
        finally:
            await queue.put(None)  # sentinel: producer done

    producer_task = asyncio.create_task(_producer())
    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=10.0)
            except asyncio.TimeoutError:
                yield _sse_ping()
                continue
            if event is None:
                break
            yield _sse(event)
    finally:
        if not producer_task.done():
            producer_task.cancel()
            try:
                await producer_task
            except (asyncio.CancelledError, Exception):
                pass

    yield _sse({"type": "done"})
