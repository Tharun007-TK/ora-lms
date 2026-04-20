# Ora LMS — Claude Code Project Context

> **Ora** is a full-stack Learning Management System for MCET (Dr. Mahalingam College of Engineering and Technology), Pollachi. Three roles: Admin, Faculty, Student. This is a portfolio-grade project intended for demo and deployment — every feature must be implemented fully, error-handled, and production-quality. Never scaffold placeholders, never leave TODOs, never rewrite what already works.

---

## Current State (be honest)

- **Days 1–8 are feature-complete locally.** Auth, core LMS, library, college pages, AI Notes Maker, RAG AI Assistant, Code Judge, notifications, PWA, seed/demo — all functional in the dev environment.
- **v1 is NOT yet deployed.** Vercel + Render + Supabase are the target; wiring is pending. Treat this as a local-dev codebase, not a live production system.
- **Design system is in a transitional state.** The Ora design system exists as CSS tokens and a few primitives, but ~40+ surfaces across admin/faculty/student still use shadcn/ui directly. Full Ora rollout is scheduled for Day 13+.
- **Current work:** Days 9–12 (Profiles, Email Validation, Quiz Assignments, Calendar).
- **Deferred to Day 13+:** Ora rollout (mass migration), Deploy, observability, accessibility audit, E2E tests.

---

## Key Differentiators

- **AI Notes Maker** — Faculty uploads a PDF chapter → Groq API generates structured, student-ready notes automatically.
- **AI Assistant (RAG)** — Students ask subject questions → LlamaIndex retrieves course-relevant context → Claude streams an answer.
- **Code Judge** — Students submit code → Judge0 CE executes in a sandbox → verdict stored in DB.
- **Real-time Notifications** — Redis pub/sub pushes notifications across all roles via SSE.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| UI components | **shadcn/ui (New York style) — current**; Ora rollout deferred to Day 13+ |
| Backend | FastAPI, SQLAlchemy (async), Alembic, asyncpg |
| Database | PostgreSQL via Supabase (pgvector extension enabled) |
| Auth | JWT in httpOnly cookies, passlib bcrypt |
| Storage | Supabase Storage — buckets: `notes`, `library`, `submissions`, `avatars` |
| AI — Notes Maker | Groq API (PDF text → structured notes via PyMuPDF) |
| AI — Assistant | Anthropic Claude API + LlamaIndex RAG + pgvector |
| Code Execution | Judge0 CE — public (`https://ce.judge0.com`, no auth) or self-hosted with `X-Auth-Token` |
| Realtime | Redis pub/sub → SSE stream to frontend |
| Deployment target | Vercel (frontend), Render (backend + Redis) — pending |

> **Judge0 note:** Currently using the free public instance at `https://ce.judge0.com` with no auth. Single env var: `JUDGE0_API_URL`. RapidAPI path is commented out pending prod provisioning.

---

## Design System — Transitional

**Current reality:**
- shadcn/ui is the primary UI layer for v1 (Days 1–8) and stays the primary layer for Days 9–12.
- Ora tokens exist in `src/styles/ora-*.css`. Ora primitives exist in `src/components/ora/` but are not yet applied broadly.
- **STYLE.md rules are partially suspended until Day 13.** Specifically: the "use Ora primitives, not shadcn primitives that duplicate them" rule does NOT apply during Days 9–12. Use shadcn as the rest of the codebase does. This avoids a half-migrated mess.
- **Tokens still apply.** When you need colors, spacing, or typography, use Ora tokens (`var(--ink)`, `var(--paper)`, `var(--ember)`, `.t-*` classes). Don't hardcode hex values. Don't introduce new colors outside the Ora palette.

**At Day 13:**
- STYLE.md rules are reinstated in full.
- All ~40 shadcn surfaces are migrated to Ora primitives.
- Every surface Days 9–12 creates will be migrated as part of that rollout. Budget for this rework now.

**Until then:** shadcn for primitives, Ora for tokens.

---

## System Architecture

```text
[Next.js PWA — Vercel (pending)]
       │
       │  REST + JWT (httpOnly cookie)
       │  SSE stream (notifications + AI chat)
       ▼
[FastAPI — Render (pending)]
       │
       ├──► [PostgreSQL + pgvector — Supabase]   ← all app data + embeddings
       ├──► [Supabase Storage]                   ← PDFs, submissions, library, avatars (signed URLs only)
       ├──► [Redis — Render]                     ← pub/sub for notifications
       ├──► [Groq API]                           ← AI Notes Maker
       ├──► [Anthropic Claude API]               ← AI Assistant (RAG answers, streamed)
       └──► [Judge0 CE]                          ← code sandbox execution
```

**Critical data flows:**

1. **Auth** → Login → FastAPI validates → JWT in httpOnly cookie → role-based redirect.
2. **File storage** → Upload → FastAPI validates → Supabase Storage → path in DB → client requests → FastAPI returns signed URL → browser fetches directly.
3. **AI Notes Maker** → PDF upload → PyMuPDF extracts text → Groq structures it → saved to `notes` with `ai_generated=true`.
4. **RAG Chat** → Question → LlamaIndex queries pgvector → top-5 chunks → Claude streams answer via SSE.
5. **Code Judge** → Code submit → Judge0 CE → poll verdict → save → UI badge.

---

## Build Order — Unified

| Day | Focus | Status | Done When |
|---|---|---|---|
| 1 | Repo setup + Auth | ✅ Complete | Login works, JWT cookie, role redirect, DB connected |
| 2 | Core LMS | ✅ Complete | Courses, notes, assignments end-to-end for all roles |
| 3 | Library + College pages | ✅ Complete | SSG public pages live, library upload + browse working |
| 4 | AI Notes Maker | ✅ Complete | PDF upload → Groq → structured notes visible in UI |
| 5 | AI Assistant (RAG) | ✅ Complete | SSE chat working in courses, embeddings in pgvector |
| 6 | Judge0 + Notifications | ✅ Complete | Code submission → verdict badge, real-time bell working |
| 7 | PWA + Polish | ✅ Complete | Manifest + service worker + icons, `npm run build` passes |
| 8 | Seed + Demo prep | ✅ Complete | Seed script runs clean, 10-min demo rehearsed |
| 9 | Rich User Profiles | 🔨 Next | Profile CRUD + avatar/cover upload + public view all roles |
| 10 | Email Domain Validation | ⏳ Queued | `@mcet.in` students, `@drmcet.ac.in` faculty+admin, DB + Pydantic |
| 11 | MCQ Quiz Assignments | ⏳ Queued | Faculty creates quiz, student attempts, auto-graded, seed updated |
| 12 | Calendar Aggregation | ⏳ Queued | Read-only view of all deadlines for all roles |
| 13+ | Ora Design System Rollout | ⏳ Deferred | All ~40 surfaces migrated to Ora primitives, STYLE.md reinstated |
| 14+ | Deploy | ⏳ Deferred | Live on Vercel + Render + Supabase prod |
| 15+ | Observability, E2E, a11y | ⏳ Deferred | Sentry, Playwright, WCAG AA pass |

**One day at a time.** Do not combine days. Ship, verify, commit before moving on.

---

## Project Structure

### Frontend — Next.js 14 App Router

```text
app/
  (auth)/
    login/page.tsx
    register/page.tsx

  (student)/
    layout.tsx
    dashboard/page.tsx
    courses/page.tsx
    courses/[id]/page.tsx
    courses/[id]/notes/page.tsx
    courses/[id]/assignments/page.tsx
    courses/[id]/assignments/[aid]/attempt/page.tsx   ← Day 11
    library/page.tsx
    library/[id]/page.tsx
    judge/page.tsx
    judge/[id]/page.tsx
    calendar/page.tsx                                 ← Day 12
    profile/page.tsx                                  ← Day 9 (edit view)

  (faculty)/
    layout.tsx
    dashboard/page.tsx
    courses/page.tsx
    courses/new/page.tsx
    courses/[id]/page.tsx
    courses/[id]/notes/page.tsx
    courses/[id]/notes/generate/page.tsx
    courses/[id]/assignments/page.tsx
    courses/[id]/assignments/new/page.tsx             ← Day 11 (type toggle)
    courses/[id]/assignments/[aid]/edit/page.tsx      ← Day 11 (quiz editor + preview)
    courses/[id]/submissions/page.tsx
    library/page.tsx
    library/upload/page.tsx
    calendar/page.tsx                                 ← Day 12
    profile/page.tsx                                  ← Day 9 (edit view)

  (admin)/
    layout.tsx
    dashboard/page.tsx
    users/page.tsx
    users/new/page.tsx
    departments/page.tsx
    courses/page.tsx
    judge/problems/page.tsx
    judge/problems/new/page.tsx
    analytics/page.tsx
    calendar/page.tsx                                 ← Day 12
    profile/page.tsx                                  ← Day 9 (edit view)

  (public)/
    college/page.tsx                                  ← SSG
    college/departments/[id]/page.tsx                 ← SSG
    college/faculty/[id]/page.tsx                     ← SSG (reads from user_profiles post-Day 9)
    u/[user_id]/page.tsx                              ← Day 9 (public profile, SSR)

  not-found.tsx
  loading.tsx
  error.tsx

components/
  ui/                        ← shadcn primitives (current primary UI layer)
  ora/                       ← Ora primitives + components (exists, applied sparingly pre-Day 13)
    primitives/              ← Button, Input, Badge, Avatar, Card
  layout/
    Sidebar.tsx              ← Calendar nav entry added Day 12
    Navbar.tsx
    NotificationBell.tsx
  AIAssistant.tsx
  CourseCard.tsx
  NoteCard.tsx
  AssignmentCard.tsx         ← type badge added Day 11
  BookCard.tsx
  ProblemCard.tsx
  SubmissionBadge.tsx

hooks/
  useNotifications.ts

lib/
  api.ts
  auth.ts

styles/
  ora-tokens.css
  ora-typography.css
  ora-utilities.css

middleware.ts
```

### Backend — FastAPI

```text
backend/
  main.py
  core/
    config.py
    auth.py
    database.py
  routers/
    auth.py
    courses.py
    assignments.py          ← extended Day 11 (quiz endpoints)
    notes.py
    library.py
    college.py
    notifications.py
    judge.py
    ai.py
    profile.py              ← Day 9
    calendar.py             ← Day 12
  models/
    tables.py
  schemas/
    requests.py
  services/
    ai_service.py
    judge_service.py
    storage_service.py
    notification_service.py
    quiz_service.py         ← Day 11

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
  Pillow              ← Day 9 (avatar validation + resize)
```

---

## Database Schema

All models live in `models/tables.py` using SQLAlchemy async ORM. **All schema changes are Alembic migrations — never edit `tables.py` without a matching migration.**

```python
users            (id, email, password_hash, role: enum[admin|faculty|student],
                  name, department_id, created_at)

departments      (id, name, code, description)

courses          (id, title, code, description, department_id,
                  faculty_id → users, semester, created_at)

enrollments      (id, student_id → users, course_id → courses, enrolled_at)

notes            (id, course_id → courses, title, content, file_url,
                  ai_generated: bool, created_by → users, created_at)

note_embeddings  (id, note_id → notes, chunk_text, embedding: vector(1536))

assignments      (id, course_id → courses, title, description, due_date,
                  max_marks, created_by → users, created_at,
                  type: enum[file|quiz] default 'file')          ← Day 11

submissions      (id, assignment_id → assignments, student_id → users,
                  file_url, marks, feedback, submitted_at, graded_at)

library_books    (id, title, author, category, file_url, cover_url,
                  uploaded_by → users, created_at)

notifications    (id, user_id → users, title, body, read: bool, created_at)

college_info     (id, about, vision, mission, established_year, updated_at)

# faculty_profiles — DEPRECATED in Day 9; merged into user_profiles
faculty_profiles (id, user_id → users, designation, qualifications,
                  achievements, photo_url, department_id)

# Day 9 — rich profiles for all roles
user_profiles    (user_id → users PK/FK, avatar_url, cover_url,
                  bio text, headline, links jsonb, skills jsonb,
                  designation, qualifications, achievements,   ← nullable, faculty-only
                  is_public bool default false, updated_at)

# Day 11 — quiz assignments
quiz_questions   (id, assignment_id → assignments, question_text,
                  position int, points int default 1, created_at)
quiz_options     (id, question_id → quiz_questions, option_text,
                  is_correct bool, position int)
quiz_attempts    (id, assignment_id → assignments, student_id → users,
                  started_at, submitted_at, score int, max_score int)
quiz_answers     (id, attempt_id → quiz_attempts, question_id → quiz_questions,
                  selected_option_id → quiz_options, is_correct bool)

judge_problems   (id, title, description, difficulty: enum[easy|medium|hard],
                  examples, constraints, created_by → users, created_at)

judge_submissions(id, problem_id → judge_problems, student_id → users,
                  language_id, source_code, status, stdout, stderr,
                  time_ms, memory_kb, submitted_at)

coding_testcases (id, problem_id → judge_problems, input, expected_output, is_hidden)
```

---

## Feature Specs (Days 1–8 — Shipped Locally)

### Auth
- `POST /auth/login` — validate credentials, issue JWT in httpOnly cookie, return user role.
- `POST /auth/register` — admin-only or open depending on config.
- `POST /auth/logout` — clear cookie.
- `GET /auth/me` — return current user from JWT.
- Frontend `middleware.ts` — redirect unauthenticated + wrong-role users.

### Student Features
- **Dashboard** — enrolled courses with progress, upcoming assignments with red <24h countdown, recent notifications.
- **Courses** — list enrolled, course detail with Notes/Assignments tabs, AI badge on `ai_generated=true` notes, floating AI Assistant button (Sheet panel, SSE streaming, course-scoped RAG, "Powered by Ora AI" footer, in-memory history only).
- **Assignments** — pending + past list, file upload with `XMLHttpRequest` progress, grade + feedback view. (Day 11 adds quiz type.)
- **Library** — browse by category, signed URL download.
- **Code Judge** — problem list with difficulty badge, Monaco editor, language selector (Python/C++/Java/JS), verdict badge (AC/WA/TLE/RE/CE), per-problem submission history.

### Faculty Features
- **Dashboard** — my courses, recent submissions, notifications.
- **Course Management** — create/edit courses, manual note upload + AI Notes Maker (PDF → PyMuPDF → Groq → structured notes with AI badge), assignment creation, submission review + grading.
- **Library** — upload book PDF + cover image.

### Admin Features
Dashboard stats, user CRUD (assign department to faculty), department CRUD, course management (reassign faculty), judge problem CRUD with test cases (visible + hidden), analytics.

### College Pages (Public, SSG)
- `/college` — about, vision, mission from `college_info`.
- `/college/departments/[id]` — department detail + faculty list.
- `/college/faculty/[id]` — faculty profile. **Post-Day 9:** reads from `user_profiles` via join.

### Notifications (Realtime)
- Redis pub/sub publishes on: assignment created, submission graded, new note added.
- `GET /notifications/stream` — SSE endpoint, keeps connection open.
- `NotificationBell.tsx` — red badge, popover, time-ago, "Mark all as read".

---

## Feature Specs (Days 9–12 — Current Work)

### Day 9 — Rich User Profiles

**Scope:** All users (admin/faculty/student) can edit their own profile — avatar, cover, bio, headline, links, skills. Faculty-only fields (designation, qualifications, achievements) live on the same table, nullable for non-faculty. Not a social feed — no posts, no followers.

**Schema:** New `user_profiles` (one-to-one with users). Migrate existing `faculty_profiles` rows, then drop `faculty_profiles`.

**Endpoints (new `routers/profile.py`):**
- `GET /profile/me` — current user's full profile.
- `PATCH /profile/me` — partial update (Pydantic with all-optional fields).
- `POST /profile/me/avatar` — multipart → Supabase Storage → signed URL.
- `POST /profile/me/cover` — same pattern.
- `GET /profile/{user_id}` — public view. 403 if `is_public=false` and requester is not owner or admin.

**Rules:**
- Avatar ≤2MB, cover ≤5MB. JPEG/PNG/WebP only. Validate server-side.
- Filename pattern: `{user_id}-avatar-{timestamp}.{ext}`.
- Signed URLs, 1-hour expiry, regenerated on each fetch.
- Bio ≤500 chars. Headline ≤120. Skills ≤20. Enforce server + client.

**Frontend:**
- Role-specific `profile/page.tsx` pages become edit views for own profile.
- New `app/(public)/u/[user_id]/page.tsx` (SSR — profile changes should be live, not stale SSG).
- `college/faculty/[id]` updated to read from `user_profiles`.
- **UI library:** shadcn/ui (matches current codebase). Tokens from Ora (colors, type, spacing).

**Seed:** Populate `user_profiles` for all seeded users.

---

### Day 10 — Email Domain Validation

**Scope:** Enforce `@mcet.in` (students) and `@drmcet.ac.in` (faculty + admin) at application and database layers.

**Implementation order (non-negotiable):**
1. **Fix seed first.** Update `seed.py` to use correct domains. Admin: `admin@drmcet.ac.in`. Students: `<n>@mcet.in`. Faculty: `<n>@drmcet.ac.in`.
2. **Pydantic validator** on `UserCreate` and `UserRegister` in `schemas/requests.py`. Case-insensitive, lowercased on store.
3. **Frontend validation** — inline error on blur on register + admin-create-user forms.
4. **Audit existing users:**
   ```sql
   SELECT id, email, role FROM users WHERE
     (role = 'student' AND email NOT LIKE '%@mcet.in') OR
     (role IN ('faculty', 'admin') AND email NOT LIKE '%@drmcet.ac.in');
   ```
   Produce report. Do NOT auto-update. Resolve violations manually.
5. **Alembic migration** adding CHECK constraint — apply ONLY after audit is clean.

**CHECK constraint:**
```sql
ALTER TABLE users ADD CONSTRAINT email_role_domain CHECK (
  (role = 'student' AND email LIKE '%@mcet.in') OR
  (role IN ('faculty', 'admin') AND email LIKE '%@drmcet.ac.in')
);
```

---

### Day 11 — Quiz Assignments (MCQ-only, v1)

**Scope cap — non-negotiable:** MCQ only. No timer, no randomization, no short-answer/essay/code-answer/fill-in-blank. No partial credit. Auto-graded on submit. One attempt per student. No manual grading override. If any are needed, flag for v2 — do not silently add them.

**Schema:**
- Add `type ENUM(file, quiz) DEFAULT 'file' NOT NULL` to `assignments`.
- New tables: `quiz_questions`, `quiz_options`, `quiz_attempts`, `quiz_answers`.

**Endpoints (extend `routers/assignments.py` — NOT a parallel quiz router):**
- `POST /assignments/{id}/quiz/questions` — faculty adds a question with options (transactional).
- `PATCH /assignments/{id}/quiz/questions/{qid}` — faculty edits. 409 if any student has started an attempt.
- `DELETE /assignments/{id}/quiz/questions/{qid}` — faculty deletes. Same 409 rule.
- `POST /assignments/{id}/quiz/attempt` — student starts. Returns attempt_id + questions with correct-option flags stripped.
- `POST /assignments/{id}/quiz/attempt/{attempt_id}/submit` — student submits. Auto-grades. Returns score.
- `GET /assignments/{id}/quiz/attempts` — faculty sees all attempts.

**Auto-grading (`services/quiz_service.py`):** Multi-correct — all correct AND no incorrect selected = full points. Otherwise 0. No partial credit.

**Integrity rules:**
- Correct options NEVER returned in student-facing attempt API until after submission.
- One attempt per student — repeat starts return the existing `attempt_id`.
- Faculty edit locked after first student start (409).

**Faculty UI:**
- Assignment-new page: type toggle (File | Quiz).
- If Quiz: question editor — add question, 2–6 options per question, mark correct option(s). Single + multi-correct.
- Preview mode: faculty sees quiz as student would, without correct indicators.

**Student UI:**
- Quiz attempt at `courses/[id]/assignments/[aid]/attempt` — question-by-question, progress bar, submit on last question, results screen with per-question correct/incorrect + points earned.

**Component update:** `AssignmentCard.tsx` shows type badge (Quiz / File).

**UI library:** shadcn/ui. Tokens from Ora.

**Seed:** Add 1 quiz assignment with 3 questions (mix of single + multi-correct).

---

### Day 12 — Calendar Aggregation View

**Scope cap — non-negotiable:** Read-only aggregation of existing deadlines. No user-created events, no recurrence, no reminders, no iCal sync. v2 if needed.

**No schema changes.** Pure read-layer.

**Endpoint (new `routers/calendar.py`):**
- `GET /calendar?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Role-based filtering:
  - Student: assignments + quizzes from enrolled courses.
  - Faculty: assignments + quizzes they created.
  - Admin: all (paginated).
- Reject ranges > 90 days (400).
- Response shape:
  ```json
  [{
    "id": "assignment:42",
    "type": "assignment" | "quiz",
    "title": "...",
    "course_id": 7,
    "course_title": "...",
    "due_date": "2026-05-01T23:59:00Z",
    "status": "pending" | "submitted" | "graded" | "overdue"
  }]
  ```

**Frontend:**
- New `calendar/page.tsx` for each role.
- Use shadcn `Calendar` (react-day-picker under the hood). Do NOT add a second calendar lib.
- Month view default, day-cell dots colored by type + status (pending / overdue red / submitted green / graded).
- Click day → side panel lists that day's events. Click event → navigate to assignment detail.
- Add "Calendar" entry to `Sidebar.tsx` for all three roles.

---

## Deferred — Day 13+

These are not active work. Do not start without explicit instruction.

- **Day 13–14: Ora Design System Rollout.** Migrate all surfaces (admin/faculty/student dashboards, layouts, cards, RoleShell, primitives like CourseCard/NoteCard/BookCard/AssignmentCard/ProblemCard/SubmissionBadge) from shadcn → Ora. Reinstate STYLE.md in full. Budget includes redoing Day 9–12 UI work.
- **Day 15: Deploy.** Vercel (frontend) + Render (backend + Redis). Wire env vars, verify prod DB/pooler, Judge0 strategy, CI.
- **Day 16+: Observability.** Sentry, structured logging, rate limits, Redis SSE hardening.
- **Day 17+: E2E test suite.** Playwright journeys for all roles.
- **Day 18+: Accessibility audit.** Keyboard nav, ARIA, contrast WCAG AA, screen-reader labels.
- **Day 19+: Security pass.** JWT secret rotation, bcrypt cost review, signed URL expiry review, CORS prod tightening, RBAC fuzz.

---

## AI Services

### AI Notes Maker (`services/ai_service.py`)

```python
async def generate_notes_from_pdf(file_bytes: bytes, course_id: int, created_by: int):
    # 1. PyMuPDF extracts text
    # 2. Chunk into ~2000-token segments
    # 3. Per chunk → Groq API (llama3-8b-8192):
    #    "Convert this raw textbook content into structured student notes
    #     with clear headings, bullet points, key definitions, and
    #     important formulas. Format in Markdown."
    # 4. Concatenate outputs
    # 5. Save to notes with ai_generated=True
    # 6. Trigger embedding as BackgroundTask (don't block response)
```

### RAG AI Assistant (`services/ai_service.py`)

```python
async def rag_chat_stream(question: str, course_id: int):
    # 1. Embed question (LlamaIndex)
    # 2. Query pgvector — top-5 chunks for course_id
    # 3. Build context string
    # 4. Anthropic Claude API:
    #    system: "You are Ora AI, a helpful academic assistant for MCET students.
    #             Answer based only on the provided course context."
    #    user:   f"Context:\n{context}\n\nQuestion: {question}"
    # 5. Stream tokens via SSE
```

### Embeddings

```python
async def embed_note(note_id: int, content: str):
    # Always BackgroundTask. Never block notes creation.
    # Chunk → embed → upsert into note_embeddings.
```

---

## Code Judge Service (`services/judge_service.py`)

```python
JUDGE0_API_URL = settings.JUDGE0_API_URL  # public ce.judge0.com, no auth

async def submit_code(source_code, language_id, stdin) -> dict:
    # POST /submissions?base64_encoded=false&wait=false → token

async def get_verdict(token) -> dict:
    # GET /submissions/{token}?base64_encoded=false&fields=status,stdout,stderr,time,memory
    # Poll until status.id not in [1, 2]
    # → { status, stdout, stderr, time_ms, memory_kb }

# Language IDs: 71=Python3, 54=C++17, 62=Java, 63=JavaScript
```

---

## API — Key Rules

1. **JWT verification on every endpoint** via `get_current_user`.
2. **Role checks are mandatory.** Use role dependencies:
   ```python
   def require_faculty(user = Depends(get_current_user)):
       if user.role != "faculty": raise HTTPException(403)
       return user
   ```
3. **Signed URLs only** — never return raw Supabase Storage URLs.
4. **Background tasks for embeddings** — never block on vector indexing.
5. **Structured errors** — all errors return `{"detail": "..."}`.

---

## Frontend — Key Rules

1. **All FastAPI calls go through `lib/api.ts`** — never `fetch()` directly from components.
   ```typescript
   export async function apiFetch(path: string, options?: RequestInit) {
     const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
       ...options,
       credentials: 'include',
       headers: { 'Content-Type': 'application/json', ...options?.headers }
     })
     if (res.status === 401) { window.location.href = '/login'; return; }
     if (!res.ok) throw new Error(await res.text())
     return res.json()
   }
   ```
2. **Server Components by default** — `'use client'` only when browser APIs or interactivity are required.
3. **SSG for college pages** — `generateStaticParams` + `revalidate: 3600`. **Exception:** `u/[user_id]` is SSR.
4. **Every data-fetching page has** `loading.tsx` + `error.tsx`.
5. **Never use HTML `<form>` tags** — use `onClick` handlers.
6. **Monaco editor for code judge** — `@monaco-editor/react`.
7. **UI components (Days 9–12):** Use shadcn primitives (matches current codebase). Use Ora tokens for all colors, spacing, typography. Do not introduce a third UI library.

---

## PWA Configuration

```bash
npm install @ducanh2912/next-pwa
```

`next.config.js` — wrap with `withPWA`, `dest: 'public'`, `disable: dev`.

`public/manifest.json`:
```json
{
  "name": "Ora — MCET LMS",
  "short_name": "Ora",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAFAF5",
  "theme_color": "#D85A30",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Add `theme-color` and `apple-mobile-web-app-capable` meta tags in `app/layout.tsx`. `theme_color` must match Ora Ember; `background_color` must match Ora Paper.

---

## Environment Variables

### Frontend (Vercel — pending deploy)
```
NEXT_PUBLIC_API_URL=https://ora-api.onrender.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Backend (Render — pending deploy)
```
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JUDGE0_API_URL=https://ce.judge0.com
JUDGE0_WAIT=false
JUDGE0_TIMEOUT_SECONDS=10
REDIS_URL=redis://...
```

---

## Demo Seed Script

`backend/seed.py` populates:
- 1 admin: `admin@drmcet.ac.in`
- 3 departments: CSE, ECE, MECH
- 5 faculty: `<n>@drmcet.ac.in`, each with `user_profiles` row (post-Day 9)
- 15 students: `<n>@mcet.in`, each with `user_profiles` row (post-Day 9)
- 3 courses with enrollments
- Sample notes (2 manual, 1 `ai_generated=true`)
- 3 assignments: 1 file-type pending, 1 file-type past-due, 1 quiz-type with 3 questions (post-Day 11)
- 5 library books
- College info (real MCET details)
- 3 coding problems (easy/medium/hard) with test cases
- 10 notifications across accounts

Seed must run clean on a fresh DB. Update seed after every new feature.

---

## Migration Discipline (Days 9+)

Even though v1 isn't deployed, new schema changes follow migration discipline — because Day 14+ deployment must not have to reconcile schema history.

1. **Every schema change is an Alembic migration.** Never edit `tables.py` without a matching migration.
2. **Show migration SQL before applying.** Claude Code generates; human reviews; human applies.
3. **No breaking changes to v1 endpoints.** Add new endpoints; extend response shapes only with optional fields.
4. **Update `seed.py` after every feature.** Seed must always run clean.
5. **Update the demo sequence** when a new feature is demo-worthy.
6. **Extend, don't rewrite.** Don't refactor working v1 code to make a new feature easier. If tempted, stop and flag it.

---

## Non-Negotiable Rules

1. **Never scaffold placeholders.** If a feature is listed, implement it fully.
2. **Always handle errors.** Every API call, file upload, and DB query needs try/catch with meaningful error responses.
3. **Role checks are mandatory.** Every protected endpoint verifies role before processing.
4. **Signed URLs only.** Never expose raw Supabase Storage URLs.
5. **Background tasks for embeddings.** Never block a response on vector indexing.
6. **Build and verify locally before each commit.** `npm run build` must pass with zero TypeScript errors.
7. **When fixing a bug, state the root cause before writing the fix.**
8. **No `any` types in TypeScript.** Define proper interfaces for all API responses.
9. **Render timeout awareness.** Render free tier has a 30s request timeout. Keep AI streaming responses alive with keepalive pings.
10. **Judge0 rate-limit awareness.** Log every Judge0 call. Queue requests to avoid hitting the 50 req/day cap during demo.
11. **One day at a time.** Do not combine Day 9 + Day 10 + Day 11 in one session. Ship, verify, commit, then move on.
12. **Scope discipline.** If a task starts expanding beyond its stated scope, stop and flag it. No silent additions.
13. **Ask before inventing.** If the system (this doc, STYLE.md) doesn't define a pattern, ask — don't improvise.
14. **STYLE.md is partially suspended for Days 9–12.** Use shadcn primitives (current codebase convention). Use Ora tokens for colors/type/spacing. Full STYLE.md enforcement resumes Day 13.

---

## 10-Minute Demo Sequence

1. Open Ora → login as student → dashboard with courses + upcoming assignments (including a quiz on the Calendar).
2. Open a course → notes list with AI badge.
3. Ask AI assistant → streamed answer.
4. Assignments → show pending file-type with red countdown; click quiz-type → take 3-question quiz → show auto-graded result.
5. Calendar → show aggregated deadlines across courses.
6. Profile → edit avatar, bio, skills → "View public profile" → see the public view.
7. Login as faculty → dashboard.
8. Upload PDF chapter → AI Notes Maker → structured notes appear.
9. Create quiz assignment → add questions → preview mode.
10. Coding platform → solve problem → AC verdict.
11. College pages → department → faculty profile (from user_profiles).
12. Notification bell → real-time unread badge update.

---

## Execution Prompt Templates (Reference Only — Not Active Directives)

> **IMPORTANT:** The prompts below are templates to paste into Claude Code *when you are ready to execute that day*. They are NOT standing instructions. Do not begin executing any of them unless the user explicitly pastes one as a new turn. Treat them as documentation.

<details>
<summary>Day 9 — Rich User Profiles</summary>

```
Implement Day 9 from CLAUDE.md: Rich User Profiles.

Scope is strictly what's written under "Day 9 — Rich User Profiles". Do not
touch Day 10–12 features.

Specifically:
1. Create an Alembic migration that:
   - Adds the user_profiles table per the schema in CLAUDE.md.
   - Migrates existing faculty_profiles rows into user_profiles.
   - Drops faculty_profiles AFTER confirming data is migrated.
2. Add SQLAlchemy model for user_profiles in models/tables.py. Do not modify
   any other model.
3. Add endpoints in a new routers/profile.py file: GET /profile/me,
   PATCH /profile/me, POST /profile/me/avatar, POST /profile/me/cover,
   GET /profile/{user_id}. Mount the router in main.py.
4. Update storage_service.py for image upload with the filename pattern
   specified (user_id-avatar-timestamp.ext). Add 'avatars' bucket.
5. Frontend: update app/(student)/profile/page.tsx,
   app/(faculty)/profile/page.tsx, and create app/(admin)/profile/page.tsx
   so all three are full edit views for the current user.
6. Create app/(public)/u/[user_id]/page.tsx as the public profile view (SSR).
7. Update app/(public)/college/faculty/[id]/page.tsx to read from the new
   user_profiles table via a join.
8. Update backend/seed.py to populate user_profiles for all seeded users.

UI library constraint:
- Use shadcn primitives (matches current codebase). Use Ora tokens for colors,
  type, spacing. Do NOT try to migrate to Ora primitives — that's Day 13+.

Other constraints:
- No new npm deps. Backend: Pillow is allowed for image validation.
- Show me the migration SQL before applying.
- Do not run the migration — I'll run it manually after review.
- After generating files, list every file created or modified with a
  one-line description of what changed.

When done, stop. Do not start Day 10.
```
</details>

<details>
<summary>Day 10 — Email Domain Validation</summary>

```
Implement Day 10 from CLAUDE.md: Email Domain Validation.

Prerequisites check:
- Confirm Day 9 migration has been applied and committed.
- Before making any changes, run the audit query and output results:
  SELECT id, email, role FROM users WHERE
    (role = 'student' AND email NOT LIKE '%@mcet.in') OR
    (role IN ('faculty', 'admin') AND email NOT LIKE '%@drmcet.ac.in');
  Do NOT proceed with the CHECK constraint migration until I confirm the
  audit is clean.

Then implement:
1. Update seed.py first to use correct domains: admin@drmcet.ac.in, all
   students @mcet.in, all faculty @drmcet.ac.in. Re-run seed locally to
   confirm it passes.
2. Pydantic validator on UserCreate and UserRegister schemas in
   schemas/requests.py. Case-insensitive, lowercased on store.
3. Frontend validation on register + admin-create-user forms — inline error
   on blur.
4. Generate (but don't apply) the Alembic migration adding the CHECK
   constraint. Output the migration file for my review.

Constraints:
- Do not modify users table structure beyond the CHECK constraint.
- Do not auto-update any existing user rows.

When done, stop. Do not start Day 11.
```
</details>

<details>
<summary>Day 11 — MCQ Quiz Assignments</summary>

```
Implement Day 11 from CLAUDE.md: Quiz Assignments (MCQ-only v1).

Scope cap: MCQ only. No timer, no randomization, no short-answer, no
partial credit, no manual grading override. If tempted to add any of
those, stop and flag it instead.

Implement:
1. Alembic migration: add assignments.type column (enum file|quiz, default
   'file'), and create quiz_questions, quiz_options, quiz_attempts,
   quiz_answers tables per CLAUDE.md schema.
2. SQLAlchemy models for all four new tables. Add type field to existing
   Assignment model. Do not rewrite Assignment.
3. All endpoints listed under Day 11 in routers/assignments.py (extend;
   don't create a parallel router).
4. Auto-grading in a new services/quiz_service.py: all-correct +
   none-incorrect = full points, else zero.
5. Faculty UI: in app/(faculty)/courses/[id]/assignments/new/page.tsx, add
   assignment type toggle. If quiz, show question editor.
6. Faculty UI: preview mode on the quiz edit page.
7. Student UI: new attempt route at
   app/(student)/courses/[id]/assignments/[aid]/attempt/page.tsx.
   Question-by-question flow, progress bar, submit on last question,
   results screen.
8. Update AssignmentCard.tsx to show type badge (Quiz / File).
9. Seed: add 1 quiz assignment with 3 questions (mix of single- and
   multi-correct).

Integrity rules:
- Faculty cannot edit questions once any student has started an attempt
  (return 409).
- Correct options never returned in student-facing attempt API until
  after submission.
- One attempt per student in v1 — repeat starts return the existing
  attempt.

UI library constraint:
- Use shadcn primitives (matches current codebase). Use Ora tokens.
  Do NOT migrate to Ora primitives — that's Day 13+.

Other constraints:
- Show me the migration SQL before applying.
- List every file created/modified at the end.

When done, stop. Do not start Day 12.
```
</details>

<details>
<summary>Day 12 — Calendar Aggregation</summary>

```
Implement Day 12 from CLAUDE.md: Calendar Aggregation View.

Scope cap: read-only aggregation of existing deadlines. No user-created
events, no recurrence, no reminders, no iCal export. If tempted, stop and
flag it.

Implement:
1. New endpoint GET /calendar?from=YYYY-MM-DD&to=YYYY-MM-DD in a new
   routers/calendar.py. Mount in main.py. Response shape exactly as
   specified under Day 12 in CLAUDE.md.
2. Role-based filtering per Day 12 spec.
3. Reject ranges > 90 days with 400.
4. Frontend: app/(student)/calendar/page.tsx,
   app/(faculty)/calendar/page.tsx, app/(admin)/calendar/page.tsx.
   Use shadcn Calendar (react-day-picker) — do not add a second calendar
   lib.
5. Month view default. Day cells show colored dots per event type/status.
   Click day opens side panel with that day's events. Click event →
   navigate to the assignment detail page.
6. Add "Calendar" entry to Sidebar.tsx nav for all three roles.

UI library constraint:
- shadcn primitives + Ora tokens. Ora primitive migration is Day 13+.

Other constraints:
- No schema changes. Read-only view layer.
- No new npm deps beyond what shadcn Calendar already requires.

When done, stop.
```
</details>