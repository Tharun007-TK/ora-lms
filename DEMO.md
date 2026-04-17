# Ora — 10-minute Demo

## Prep (run once before the demo)

```bash
# Backend
cd backend
source .venv/bin/activate      # Windows: .venv\Scripts\activate
alembic upgrade head
python seed.py
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>.

## Demo accounts

All seeded accounts use password **`Ora@MCET2026`**.

| Role    | Email                     |
|---------|---------------------------|
| Admin   | `admin@mcet.ac.in`        |
| Faculty | `r.arun@mcet.in`          |
| Faculty | `s.divya@mcet.in`         |
| Student | `727622bam046@mcet.in`    |
| Student | `727622bam001@mcet.in`    |

## Sequence

1. **PWA install (0:00)** — Open on mobile (or Chrome DevTools → Application → Manifest). Show the install prompt and the green "O" icon.
2. **Student dashboard (0:45)** — Sign in as `727622bam046@mcet.in`. Enrolled courses, unread bell badge, upcoming assignment with due-date countdown (red if <24h).
3. **Course notes + AI badge (1:45)** — Open *Design and Analysis of Algorithms* → Notes. Point out the **AI** badge on "Divide & Conquer".
4. **RAG AI Assistant (2:30)** — Click the ✨ floating button. Ask *"Explain the master theorem with an example."* Tokens stream word-by-word; citation list under the answer.
5. **Assignments (3:45)** — Show the pending "Problem Set 1" and the past-due "Lab 1 — FFT".
6. **Faculty view (4:30)** — Sign out; sign in as `r.arun@mcet.in`. Dashboard lists owned courses; open one → grade a submission (notification fires in real time).
7. **AI Notes Maker (5:30)** — From a course → Notes → **AI Notes Maker**. Upload a short PDF chapter. Three-dot loader → structured Markdown appears → "Go to notes".
8. **Code Judge (7:00)** — Back as student → Code Judge → *Sum of Two Integers*. Paste a correct Python solution, Submit → **AC** badge with time + memory. Show the submission history.
9. **Public college pages (8:15)** — Open an incognito window → `/college`. No login required. Click a department → faculty profile with photo, designation, achievements.
10. **Live notifications (9:15)** — Split screen: as admin send a new note via Faculty. The student's red bell badge increments in real time over the SSE stream. Click through to "Mark all as read".

## Gotchas

- **Claude streaming** needs `ANTHROPIC_API_KEY`. Without it `/ai/chat` emits an `error` event instead of tokens.
- **Groq Notes Maker** needs `GROQ_API_KEY` and a text-bearing PDF (scanned PDFs fail with "No extractable text").
- **OpenAI embeddings** (`OPENAI_API_KEY`) are used by the RAG retrieval step. Without it the assistant still answers, but with a disclaimer that no course context was retrieved.
- **Judge0 free tier** caps at 50 requests/day. Each submission runs *all* testcases sequentially, so three submissions across three testcases = nine requests. Demo twice, save quota.
- **Cross-site cookies** (Vercel ↔ Render) require `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none` in backend prod env.
- **Redis-less environment** is fine: notifications are still persisted in Postgres; the SSE stream just heartbeats and the UI refreshes on reload.

## Seed dataset at a glance

- 1 admin, 5 faculty (with profiles), 16 students
- 3 departments (CSE / ECE / MECH), 3 courses
- 3 notes (one AI-badged), 2 assignments (1 upcoming, 1 past due)
- 5 library books
- College info (about / vision / mission / est. 1998)
- 3 judge problems (easy / medium / hard) with visible + hidden testcases
- 10 pre-seeded notifications distributed across students

The seed is **idempotent** — re-running it only adds missing rows.
