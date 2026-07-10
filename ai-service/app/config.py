from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 4100
    # Only the main backend calls this service — CORS is irrelevant to a
    # server-to-server call, but set if you ever expose this directly.
    cors_origin: str = "http://localhost:4000"
    # No default for either — unset means the service degrades to a clear
    # "not configured" result per call instead of silently faking one (see
    # app/services/anthropic_extraction.py).
    anthropic_api_key: str | None = None
    ai_model: str = "claude-sonnet-5"
    # Optional shared secret the main backend sends as X-Internal-Api-Key.
    # Leave unset locally to skip the check entirely.
    internal_api_key: str | None = None


settings = Settings()
