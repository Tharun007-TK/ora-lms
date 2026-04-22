from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from core.config import settings
from core.database import engine
from routers import ai as ai_router
from routers import assignments as assignments_router
from routers import auth as auth_router
from routers import calendar as calendar_router
from routers import coding_assessments as coding_assessments_router
from routers import college as college_router
from routers import courses as courses_router
from routers import judge as judge_router
from routers import library as library_router
from routers import notes as notes_router
from routers import notifications as notifications_router
from routers import profile as profile_router
from routers import users as users_router
from services import storage_service
from services.judge0_client import judge0_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.2.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    judge0_ok = True
    try:
        await judge0_client.about()
    except Exception:
        judge0_ok = False
    return {
        "status": "ok",
        "env": settings.ENVIRONMENT,
        "judge0": judge0_ok,
    }


@app.get("/files/{path:path}", tags=["meta"], include_in_schema=False)
async def serve_local_file(path: str) -> FileResponse:
    """Serve dev-only local uploads. Disabled once Supabase is configured."""
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=404, detail="Not found")
    abs_path = storage_service.local_file_path(path)
    if abs_path is None:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(abs_path)


app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(courses_router.router)
app.include_router(notes_router.router)
app.include_router(assignments_router.router)
app.include_router(library_router.router)
app.include_router(college_router.router)
app.include_router(ai_router.router)
app.include_router(judge_router.router)
app.include_router(notifications_router.router)
app.include_router(profile_router.router)
app.include_router(calendar_router.router)
app.include_router(coding_assessments_router.router)
app.include_router(
    coding_assessments_router.router,
    prefix="/api",
    include_in_schema=False,
)
