from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # App
    APP_NAME: str = "Ora LMS API"
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=True)

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/ora",
    )

    # Auth
    JWT_SECRET: str = Field(default="change-me-in-prod-this-is-not-secure")
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_EXPIRES_MINUTES: int = Field(default=60 * 24 * 7)  # 7 days
    COOKIE_NAME: str = Field(default="ora_session")
    # Cross-origin (Vercel → Render) requires SameSite=none + Secure=true.
    # Leave unset to auto-derive from ENVIRONMENT; or override explicitly.
    COOKIE_SECURE: bool | None = Field(default=None)
    COOKIE_SAMESITE: str | None = Field(default=None)
    COOKIE_DOMAIN: str | None = Field(default=None)

    # CORS — comma-separated. Set to your Vercel URL on Render.
    # e.g. CORS_ORIGINS=https://ora-lms.vercel.app
    CORS_ORIGINS: str = Field(default="http://localhost:3000")

    # External services
    ANTHROPIC_API_KEY: str = Field(default="")
    ANTHROPIC_MODEL: str = Field(default="claude-sonnet-4-6")
    GROQ_API_KEY: str = Field(default="")
    GROQ_MODEL: str = Field(default="llama-3.1-8b-instant")
    # Embeddings — local HuggingFace via sentence-transformers (no API key needed).
    # BAAI/bge-small-en-v1.5 → 384 dims, optimized for retrieval, runs on CPU.
    HF_EMBED_MODEL: str = Field(default="BAAI/bge-small-en-v1.5")
    EMBED_DIM: int = Field(default=384)
    # Kept for backward-compat with deployed envs; no longer consumed.
    OPENAI_API_KEY: str = Field(default="")
    OPENAI_EMBED_MODEL: str = Field(default="text-embedding-3-small")
    SUPABASE_URL: str = Field(default="")
    SUPABASE_SERVICE_KEY: str = Field(default="")
    SUPABASE_ANON_KEY: str = Field(default="")

    # Buckets
    SUPABASE_BUCKET_NOTES: str = Field(default="notes")
    SUPABASE_BUCKET_LIBRARY: str = Field(default="library")
    SUPABASE_BUCKET_SUBMISSIONS: str = Field(default="submissions")
    SUPABASE_BUCKET_AVATARS: str = Field(default="avatars")

    # Judge0 — using free public instance, no auth required.
    # TODO: re-enable for RapidAPI prod (JUDGE0_RAPIDAPI_KEY, JUDGE0_RAPIDAPI_HOST)
    JUDGE0_API_URL: str = Field(default="https://ce.judge0.com")
    JUDGE0_WAIT: bool = Field(default=False)
    JUDGE0_TIMEOUT_SECONDS: int = Field(default=10)
    JUDGE0_MOCK: bool = Field(default=False)
    # TODO: re-enable for RapidAPI prod
    # JUDGE0_AUTH_TOKEN: str = Field(default="")

    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # Registration policy
    ALLOW_OPEN_REGISTRATION: bool = Field(default=True)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def effective_cookie_secure(self) -> bool:
        if self.COOKIE_SECURE is not None:
            return self.COOKIE_SECURE
        return self.ENVIRONMENT == "production"

    @property
    def effective_cookie_samesite(self) -> str:
        if self.COOKIE_SAMESITE is not None:
            return self.COOKIE_SAMESITE
        # Cross-origin deployments need SameSite=none (requires Secure=true).
        return "none" if self.ENVIRONMENT == "production" else "lax"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
