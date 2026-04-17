# Ora LMS — Master Claude Code Build Prompt

> You are building **Ora**, a full-stack Learning Management System for MCET (Dr. Mahalingam College of Engineering and Technology), Pollachi. This is a **production-grade application — not a prototype**. Every feature you build must be complete, error-handled, and ready for real users. Never scaffold placeholders or leave TODOs unless explicitly told to.

---

## Project Overview

**Ora** is an AI-powered LMS for a university. It has three roles — Admin, Faculty, and Student — each with their own dashboard and feature set. The key differentiators are:

- **AI Notes Maker** — Faculty uploads a PDF chapter → Groq API generates structured, student-ready notes automatically
- **AI Assistant (RAG)** — Students ask subject questions → LlamaIndex retrieves course-relevant context → Claude streams an answer
- **Code Judge** — Students submit code → Judge0 CE (self-hosted or public API) executes in a sandbox → verdict stored in DB
- **Real-time Notifications** — Redis pub/sub pushes notifications across all roles via SSE

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui (New York style, CSS variables) |
| Backend | FastAPI, SQLAlchemy (async), Alembic, asyncpg |
| Database | PostgreSQL via Supabase (pgvector extension enabled) |
| Auth | JWT in httpOnly cookies, passlib bcrypt |
| Storage | Supabase Storage — buckets: `notes`, `library`, `submissions` |
| AI — Notes Maker | Groq API (PDF text → structured notes via PyMuPDF) |
| AI — Assistant | Anthropic Claude API + LlamaIndex RAG + pgvector |
| Code Execution | Judge0 CE — public API (`https://judge0-ce.p.rapidapi.com`) with `JUDGE0_API_KEY` |
| Realtime | Redis pub/sub → SSE stream to frontend |
| Deployment | Vercel (frontend), Render (backend + Redis) |

> **Judge0 note:** The free public API has a 50 req/day cap. For production, self-host Judge0 CE via Docker Compose on the same VPS as the backend. The `JUDGE0_API_KEY` env var controls which instance is used — swap the base URL to switch between public and self-hosted.

---

## System Architecture

```
[Next.js PWA — Vercel]
       │
       │  REST + JWT (httpOnly cookie)
       │  SSE stream (notifications + AI chat)
       ▼
[FastAPI — Render]
       │
       ├──► [PostgreSQL + pgvector — Supabase]   ← all app data + embeddings
       ├──► [Supabase Storage]                   ← PDFs, submissions, library files (signed URLs only)
       ├──► [Redis — Render]                     ← pub/sub for notifications
       ├──► [Groq API]                           ← AI Notes Maker
       ├──► [Anthropic Claude API]               ← AI Assistant (RAG answers, streamed)
       └──► [Judge0 CE]                          ← code sandbox execution
```

**Critical data flows:**

1. **Auth** → User logs in → FastAPI validates → JWT issued in httpOnly cookie → role-based redirect
2. **File storage** → Upload → FastAPI validates → Supabase Storage → path in DB → student requests → FastAPI generates signed URL → browser fetches directly
3. **AI Notes Maker** → Faculty uploads PDF → PyMuPDF extracts text → Groq API generates structured notes → saved to DB with `ai_generated=true`
4. **RAG Chat** → Student asks question → LlamaIndex queries pgvector → top-5 chunks retrieved → Claude streams answer via SSE
5. **Code Judge** → Student submits code → FastAPI calls Judge0 CE → polls for verdict → saves to DB → verdict badge shown in UI

---

## Project Structure

### Frontend — Next.js 14 App Router

```
app/
  (auth)/
    login/page.tsx
    register/page.tsx

  (student)/
    layout.tsx                            ← student sidebar + navbar
    dashboard/page.tsx
    courses/page.tsx
    courses/[id]/page.tsx
    courses/[id]/notes/page.tsx
    courses/[id]/assignments/page.tsx
    library/page.tsx
    library/[id]/page.tsx
    judge/page.tsx                        ← problem list
    judge/[id]/page.tsx                   ← code editor + submission
    profile/page.tsx

  (faculty)/
    layout.tsx                            ← faculty sidebar + navbar
    dashboard/page.tsx
    courses/page.tsx
    courses/new/page.tsx
    courses/[id]/page.tsx
    courses/[id]/notes/page.tsx
    courses/[id]/notes/generate/page.tsx  ← AI Notes Maker trigger
    courses/[id]/assignments/page.tsx
    courses/[id]/assignments/new/page.tsx
    courses/[id]/submissions/page.tsx     ← review + grade
    library/page.tsx
    library/upload/page.tsx
    profile/page.tsx

  (admin)/
    layout.tsx                            ← admin sidebar + navbar
    dashboard/page.tsx
    users/page.tsx
    users/new/page.tsx
    departments/page.tsx
    courses/page.tsx
    judge/problems/page.tsx
    judge/problems/new/page.tsx
    analytics/page.tsx

  (public)/
    college/page.tsx                      ← SSG
    college/departments/[id]/page.tsx     ← SSG
    college/faculty/[id]/page.tsx         ← SSG

  not-found.tsx
  loading.tsx
  error.tsx

components/
  ui/                     ← shadcn components (do not modify)
  layout/
    Sidebar.tsx
    Navbar.tsx
    NotificationBell.tsx
  AIAssistant.tsx          ← Sheet slide-up panel, SSE streaming chat
  CourseCard.tsx
  NoteCard.tsx
  AssignmentCard.tsx
  BookCard.tsx
  ProblemCard.tsx
  SubmissionBadge.tsx      ← AC / WA / TLE / RE verdict

hooks/
  useNotifications.ts      ← SSE subscription, unread count

lib/
  api.ts                   ← base fetch wrapper, all FastAPI calls go through here
  auth.ts                  ← getToken(), clearToken()

middleware.ts              ← RBAC route guards at edge
```

### Backend — FastAPI

```
backend/
  main.py                  ← app init, CORS, router mounts, lifespan
  core/
    config.py              ← pydantic-settings, all env vars
    auth.py                ← JWT encode/decode, get_current_user dependency
    database.py            ← async SQLAlchemy engine + session factory
  routers/
    auth.py                ← POST /auth/login, POST /auth/register, POST /auth/logout
    courses.py             ← CRUD for courses + enrollments
    assignments.py         ← CRUD for assignments + submissions
    notes.py               ← CRUD for notes + AI generation trigger
    library.py             ← CRUD for library books + file upload
    college.py             ← college info, departments, faculty profiles
    notifications.py       ← GET /notifications, SSE stream, mark-read
    judge.py               ← problems CRUD, submission, verdict polling
    ai.py                  ← POST /ai/chat SSE stream, POST /ai/generate-notes
  models/
    tables.py              ← all SQLAlchemy models
  schemas/
    requests.py            ← all Pydantic request/response schemas
  services/
    ai_service.py          ← Groq notes generation + LlamaIndex RAG pipeline
    judge_service.py       ← Judge0 CE API calls, verdict polling
    storage_service.py     ← Supabase Storage upload + signed URL generation
    notification_service.py← Redis pub/sub publisher + SSE generator

requirements.txt:
  fastapi
  uvicorn[standard]
  sqlalchemy[asyncio]
  alembic
  asyncpg
  pydantic-settings
  python-jose[cryptography]
  passlib[bcrypt]
  httpx
  anthropic
  llama-index
  llama-index-vector-stores-postgres
  pymupdf
  groq
  supabase
  redis
  python-multipart
```

---

## Database Schema

Create all models in `models/tables.py` using SQLAlchemy async ORM. Run migrations via Alembic.

```python
# All tables — implement fully with proper FK relationships and indexes

users           (id, email, password_hash, role: enum[admin|faculty|student],
                 name, department_id, created_at)

departments     (id, name, code, description)

courses         (id, title, code, description, department_id,
                 faculty_id → users, semester, created_at)

enrollments     (id, student_id → users, course_id → courses, enrolled_at)

notes           (id, course_id → courses, title, content, file_url,
                 ai_generated: bool, created_by → users, created_at)

note_embeddings (id, note_id → notes, chunk_text, embedding: vector(1536))

assignments     (id, course_id → courses, title, description, due_date,
                 max_marks, created_by → users, created_at)

submissions     (id, assignment_id → assignments, student_id → users,
                 file_url, marks, feedback, submitted_at, graded_at)

library_books   (id, title, author, category, file_url, cover_url,
                 uploaded_by → users, created_at)

notifications   (id, user_id → users, title, body, read: bool, created_at)

college_info    (id, about, vision, mission, established_year, updated_at)

faculty_profiles(id, user_id → users, designation, qualifications,
                 achievements, photo_url, department_id)

judge_problems  (id, title, description, difficulty: enum[easy|medium|hard],
                 examples, constraints, created_by → users, created_at)

judge_submissions(id, problem_id → judge_problems, student_id → users,
                  language_id, source_code, status, stdout, stderr,
                  time_ms, memory_kb, submitted_at)

coding_testcases(id, problem_id → judge_problems, input, expected_output, is_hidden)
```

---

## Feature Specs — Implement All Fully

### Auth
- `POST /auth/login` — validate credentials, issue JWT in httpOnly cookie, return user role
- `POST /auth/register` — admin-only or open depending on config
- `POST /auth/logout` — clear cookie
- `GET /auth/me` — return current user from JWT
- Frontend `middleware.ts` — redirect unauthenticated users, redirect wrong-role users

### Student Features

**Dashboard**
- Enrolled courses with progress indicator
- Upcoming assignments with due-date countdown (red if <24h)
- Recent notifications (unread count badge)

**Courses**
- List all enrolled courses
- Course detail → tabs: Notes | Assignments
- Notes list → each note card shows AI badge if `ai_generated=true`
- AI Assistant floating button on every course page → opens Sheet panel
  - SSE streaming via `EventSource`
  - Course ID passed as context to RAG pipeline
  - Streamed word-by-word output
  - Three-dot loading indicator while waiting
  - "Powered by Ora AI" footer
  - Conversation history in component state only (not persisted)

**Assignments**
- List pending + past assignments
- Submit file → progress bar via `XMLHttpRequest onprogress`
- View grade + feedback after grading

**Library**
- Browse all books by category
- View book detail → signed URL download

**Code Judge**
- Problem list with difficulty badge
- Problem detail → Monaco code editor
- Language selector (Python, C++, Java, JavaScript at minimum)
- Submit → poll Judge0 CE → show verdict badge: AC / WA / TLE / RE / CE
- Submission history per problem

### Faculty Features

**Dashboard**
- My courses summary
- Recent submissions to grade
- Notification feed

**Course Management**
- Create / edit courses
- Notes management:
  - Upload file manually
  - **AI Notes Maker**: upload PDF → FastAPI extracts text via PyMuPDF → sends to Groq API → structured notes saved → shown with AI badge
- Assignment management:
  - Create assignment with due date + max marks
  - View all submissions
  - Grade submission: enter marks + text feedback → saved to DB → student notified

**Library**
- Upload book PDF + cover image → stored in Supabase Storage

### Admin Features

**Dashboard**
- System stats: total users, courses, submissions, library books

**User Management**
- List / create / deactivate users (all roles)
- Assign department to faculty

**Department Management**
- CRUD departments

**Course Management**
- View all courses, reassign faculty

**Judge Problems**
- Create coding problems with test cases (visible + hidden)
- Set difficulty, examples, constraints

**Analytics**
- Submission counts, assignment completion rates, active users

### College Pages (Public, SSG)
- `/college` — about, vision, mission from `college_info` table
- `/college/departments/[id]` — department detail + faculty list
- `/college/faculty/[id]` — faculty profile: designation, qualifications, achievements, photo

### Notifications (Real-time)
- Redis pub/sub on the backend publishes notifications on key events:
  - Assignment created → notify all enrolled students
  - Submission graded → notify that student
  - New note added → notify enrolled students
- `GET /notifications/stream` → SSE endpoint, keeps connection open, pushes new notifications
- `NotificationBell.tsx` → red badge with unread count, popover on click, time-ago format, "Mark all as read"

---

## AI Services — Implement Fully

### AI Notes Maker (`services/ai_service.py`)

```python
async def generate_notes_from_pdf(file_bytes: bytes, course_id: int, created_by: int):
    # 1. Extract text from PDF using PyMuPDF (fitz)
    # 2. Chunk text into ~2000 token segments
    # 3. For each chunk, call Groq API:
    #    - Model: llama3-8b-8192
    #    - Prompt: "Convert this raw textbook content into structured student notes
    #              with clear headings, bullet points, key definitions, and
    #              important formulas. Format in Markdown."
    # 4. Concatenate all chunk outputs
    # 5. Save to notes table with ai_generated=True
    # 6. Trigger embedding as background task (don't block response)
```

### RAG AI Assistant (`services/ai_service.py`)

```python
async def rag_chat_stream(question: str, course_id: int):
    # 1. Embed the question using LlamaIndex
    # 2. Query pgvector for top-5 similar note chunks for this course_id
    # 3. Build context string from retrieved chunks
    # 4. Call Anthropic Claude API with:
    #    system: "You are Ora AI, a helpful academic assistant for MCET students.
    #             Answer based only on the provided course context."
    #    user: f"Context:\n{context}\n\nQuestion: {question}"
    # 5. Stream response tokens back via SSE
    # CRITICAL: Use background task for embedding, never block on it
```

### Embeddings

```python
async def embed_note(note_id: int, content: str):
    # Run in BackgroundTasks — never block the notes creation response
    # Chunk content → embed each chunk → upsert into note_embeddings table
```

---

## Code Judge Service (`services/judge_service.py`)

```python
JUDGE0_BASE_URL = settings.JUDGE0_BASE_URL  # "https://judge0-ce.p.rapidapi.com" or self-hosted
JUDGE0_API_KEY = settings.JUDGE0_API_KEY

async def submit_code(source_code: str, language_id: int, stdin: str) -> dict:
    # POST to /submissions?base64_encoded=false&wait=false
    # Returns token

async def get_verdict(token: str) -> dict:
    # GET /submissions/{token}?base64_encoded=false&fields=status,stdout,stderr,time,memory
    # Poll until status.id not in [1, 2] (In Queue / Processing)
    # Return: { status, stdout, stderr, time_ms, memory_kb }

# Language ID map (Judge0 CE):
# 71 = Python 3, 54 = C++ 17, 62 = Java, 63 = JavaScript
```

---

## API — Key Rules

1. **Every endpoint must verify JWT** via `get_current_user` dependency
2. **Role checks are mandatory** — use role-specific dependencies:
   ```python
   def require_faculty(user = Depends(get_current_user)):
       if user.role != "faculty": raise HTTPException(403)
       return user
   ```
3. **Signed URLs only** — never return raw Supabase Storage URLs to the client
4. **Background tasks for embeddings** — never block a response waiting for vector indexing
5. **Structured error responses** — all errors return `{"detail": "..."}`

---

## Frontend — Key Rules

1. **All FastAPI calls go through `lib/api.ts`** — never `fetch()` directly from components
   ```typescript
   // lib/api.ts
   export async function apiFetch(path: string, options?: RequestInit) {
     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
       ...options,
       credentials: 'include',   // sends httpOnly cookie
       headers: {
         'Content-Type': 'application/json',
         ...options?.headers,
       }
     })
     if (res.status === 401) { window.location.href = '/login'; return; }
     if (!res.ok) throw new Error(await res.text())
     return res.json()
   }
   ```
2. **Server Components by default** — only add `'use client'` when you need browser APIs or interactivity
3. **SSG for college pages** — `generateStaticParams` + `revalidate: 3600`
4. **Every data-fetching page needs:**
   - `loading.tsx` — skeleton cards matching the page layout (shadcn `Skeleton`)
   - `error.tsx` — friendly message + "Try again" button calling `router.refresh()`
5. **Never use HTML `<form>` tags** — use `onClick` handlers
6. **Monaco editor for code judge** — `@monaco-editor/react`

---

## PWA Configuration

```bash
npm install @ducanh2912/next-pwa
```

`next.config.js` — wrap with `withPWA`, `dest: 'public'`, `disable: dev`

`public/manifest.json`:
```json
{
  "name": "Ora — MCET LMS",
  "short_name": "Ora",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#16a34a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Add `theme-color` and `apple-mobile-web-app-capable` meta tags in `app/layout.tsx`.

---

## Environment Variables

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://ora-api.onrender.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Backend (Render)
```
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JUDGE0_BASE_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=
REDIS_URL=redis://...
```

---

## Demo Seed Script

Create `backend/seed.py` that populates the DB with:
- 1 admin (`admin@mcet.ac.in`)
- 3 departments: CSE, ECE, MECH
- 5 faculty accounts across departments with profiles
- 15 student accounts
- 3 courses with enrollments
- Sample notes (2 manual, 1 with `ai_generated=true`)
- 2 assignments (1 pending, 1 past due)
- 5 library books
- College info (about, vision, mission — use real MCET details)
- 3 coding problems (easy/medium/hard) with test cases
- 10 notifications across accounts

---

## Build Order

| Day | Focus | Done When |
|---|---|---|
| 1 | Repo setup + Auth | Login works, JWT cookie, role redirect, DB connected |
| 2 | Core LMS | Courses, notes, assignments end-to-end for all roles |
| 3 | Library + College pages | SSG public pages live, library upload + browse working |
| 4 | AI Notes Maker | PDF upload → Groq → structured notes visible in UI |
| 5 | AI Assistant (RAG) | SSE chat working in courses, embeddings in pgvector |
| 6 | Judge0 + Notifications | Code submission → verdict badge, real-time bell working |
| 7 | PWA + Polish + Deploy | Live on Vercel + Render, `npm run build` passes |
| 8 | Seed + Demo prep | Seed script runs clean, 10-min demo rehearsed |

---

## Day-by-Day Claude Code Prompts

Use these prompts verbatim in Claude Code, one day at a time. Do not combine days.

### Day 1 — Repo Setup + Auth

```
Initialize the Ora LMS monorepo. Create:
- /frontend: Next.js 14 app with Tailwind + shadcn/ui (New York style)
- /backend: FastAPI project with the folder structure from the spec
- /backend/requirements.txt with all dependencies listed
- /backend/core/config.py with pydantic-settings for all env vars
- /backend/core/database.py with async SQLAlchemy engine
- /backend/models/tables.py with ALL database models from the schema
- /backend/core/auth.py with JWT logic
- /backend/routers/auth.py with login/register/logout endpoints
- Auth middleware.ts for Next.js RBAC route guards
Do not scaffold placeholders. Implement each file fully.
```

---

## 10-Minute Demo Sequence

1. Open Ora on mobile → show PWA install prompt
2. Login as student → dashboard with courses + upcoming assignments
3. Open a course → notes list, AI badge on AI-generated note
4. Ask AI assistant a subject question → streamed answer appears word by word
5. Assignments → show pending with red due-date countdown
6. Login as faculty → course management dashboard
7. Upload PDF chapter → trigger AI Notes Maker → show structured notes appearing
8. Coding platform → solve a problem → show AC verdict badge
9. College pages → department page → faculty profile
10. Notification bell → real-time unread badge update

---

## Non-Negotiable Rules

1. **Never scaffold placeholders.** If a feature is listed, implement it fully.
2. **Always handle errors.** Every API call, file upload, and DB query needs try/catch with meaningful error responses.
3. **Role checks are mandatory.** Every protected endpoint must verify the user's role before processing anything.
4. **Signed URLs only.** Never expose raw Supabase Storage URLs to the client.
5. **Background tasks for embeddings.** Never block a notes creation response waiting for pgvector indexing.
6. **Build and verify locally before each deploy.** `npm run build` must pass with zero TypeScript errors.
7. **When fixing a bug, state the root cause before writing the fix.**
8. **No `any` types in TypeScript.** Define proper interfaces for all API responses.
9. **Render timeout awareness.** Render free tier has a 30-second request timeout. Keep AI streaming responses alive with keepalive pings if needed.
10. **Judge0 rate limit awareness.** Log every Judge0 API call. If the free public API is used, implement a queue to avoid hitting the 50 req/day cap during demo.