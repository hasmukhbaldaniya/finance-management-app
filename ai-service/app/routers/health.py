from datetime import UTC, datetime

from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/health")


@router.get("")
async def get_health() -> dict:
    return {"status": "ok", "timestamp": datetime.now(UTC).isoformat(), "aiConfigured": bool(settings.anthropic_api_key)}
