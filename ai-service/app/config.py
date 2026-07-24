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

    # Phase 4 of docs/PLANS/microservices-plan.md — this service's own
    # database, holding just AiExtractionLog (moved here from claim-service's
    # Postgres, since that table's audit-log responsibility always
    # conceptually belonged to whichever service performs the extraction —
    # see this file's own CLAUDE.md). MySQL specifically, per explicit
    # instruction — not a technical requirement of the AI/ML work itself.
    mysql_host: str = "localhost"
    mysql_port: int = 3307
    mysql_user: str = "ai_service"
    mysql_password: str = "ai_service"
    mysql_database: str = "ai_service"

    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"


settings = Settings()
