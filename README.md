# Ora — MCET LMS

AI-powered Learning Management System for Dr. Mahalingam College of Engineering and Technology. See `CLAUDE.md` for the full product spec and build order.

## Layout

```
backend/    FastAPI + SQLAlchemy async + Alembic
frontend/   Next.js 14 App Router + Tailwind + shadcn/ui
```

## Status

Days 1–7 complete: auth, courses/notes/assignments, library + public SSG college pages, AI Notes Maker (Groq + PyMuPDF), RAG Assistant (OpenAI embeddings + pgvector + Claude SSE), Code Judge (Judge0 CE), Redis pub/sub notifications, PWA install.

## Backend — first run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit DATABASE_URL + JWT_SECRET

alembic upgrade head
uvicorn main:app --reload --port 8000
```

The Postgres database needs the `pgvector` extension. On Supabase this is a one-click enable; locally run `CREATE EXTENSION IF NOT EXISTS vector;` as a superuser.

## Frontend — first run

```bash
cd frontend
npm install
cp .env.example .env.local
# set NEXT_PUBLIC_API_URL and JWT_SECRET (must match backend)
npm run dev
```

Visit <http://localhost:3000>. Unauthenticated users land on `/login`. After login the middleware verifies the JWT cookie and redirects to the role-specific dashboard (`/student`, `/faculty`, `/admin`).

## Environment variables

| Scope | Var | Notes |
| --- | --- | --- |
| backend | `DATABASE_URL` | `postgresql+asyncpg://…` |
| backend | `JWT_SECRET` | Shared with frontend middleware |
| backend | `CORS_ORIGINS` | Comma-separated; include the Next.js origin |
| frontend | `NEXT_PUBLIC_API_URL` | Base URL of FastAPI |
| frontend | `JWT_SECRET` | Must equal the backend secret (edge middleware verifies) |
| frontend | `COOKIE_NAME` | Defaults to `ora_session` |
| backend | `ANTHROPIC_API_KEY` | Claude streaming (RAG answers) |
| backend | `GROQ_API_KEY` | AI Notes Maker |
| backend | `OPENAI_API_KEY` | `text-embedding-3-small` for pgvector |
| backend | `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Signed URL file storage; dev falls back to local disk |
| backend | `JUDGE0_API_URL` | Free public Judge0 CE (`https://ce.judge0.com`). No auth. RapidAPI path deferred. |
| backend | `REDIS_URL` | Pub/sub for notifications; graceful degrade when absent |

## Deploy

- **Frontend (Vercel):** import `frontend/`, set `NEXT_PUBLIC_API_URL` + `JWT_SECRET` (matches backend). Build command defaults work (`next build`).
- **Backend (Render):** this repo ships `render.yaml` with a web service + Redis. Point Render at the repo root and it provisions both. Fill `DATABASE_URL`, `CORS_ORIGINS`, `SUPABASE_*`, and provider keys as secrets. `preDeployCommand` runs `alembic upgrade head` on each deploy.
- **Database:** any Postgres with `pgvector` (Supabase works out of the box). Enable the extension once: `CREATE EXTENSION IF NOT EXISTS vector;`
- **Cookies across origins:** in production set `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none` so the Vercel ↔ Render cross-site session cookie survives.
- **Health check:** `GET /health` returns `{"status":"ok", ...}`.
