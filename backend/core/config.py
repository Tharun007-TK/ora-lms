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
    COOKIE_SECURE: bool = Field(default=False)
    COOKIE_SAMESITE: str = Field(default="lax")
    COOKIE_DOMAIN: str | None = Field(default=None)

    # CORS
    CORS_ORIGINS: str = Field(default="http://localhost:3000")

    # External services
    ANTHROPIC_API_KEY: str = Field(default="")
    ANTHROPIC_MODEL: str = Field(default="claude-sonnet-4-6")
    GROQ_API_KEY: str = Field(default="")
    GROQ_MODEL: str = Field(default="llama-3.1-8b-instant")
    OPENAI_API_KEY: str = Field(default="")
    OPENAI_EMBED_MODEL: str = Field(default="text-embedding-3-small")
    EMBED_DIM: int = Field(default=1536)
    SUPABASE_URL: str = Field(default="")
    SUPABASE_SERVICE_KEY: str = Field(default="")
    SUPABASE_ANON_KEY: str = Field(default="")

    # Buckets
    SUPABASE_BUCKET_NOTES: str = Field(default="notes")
    SUPABASE_BUCKET_LIBRARY: str = Field(default="library")
    SUPABASE_BUCKET_SUBMISSIONS: str = Field(default="submissions")

    # Judge0
    JUDGE0_BASE_URL: str = Field(default="https://judge0-ce.p.rapidapi.com")
    JUDGE0_API_KEY: str = Field(default="")
    JUDGE0_HOST_HEADER: str = Field(default="judge0-ce.p.rapidapi.com")

    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # Registration policy
    ALLOW_OPEN_REGISTRATION: bool = Field(default=True)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
