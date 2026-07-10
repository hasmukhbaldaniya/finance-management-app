from fastapi import Header, HTTPException

from app.config import settings


# A lightweight shared-secret check for the one caller this service ever
# expects (the main backend) — skipped entirely if internal_api_key isn't
# set, matching this service's own "unset means degrade, don't hard-fail"
# posture for the Anthropic API key. Set the same value on both sides
# before running this service anywhere beyond localhost.
async def require_internal_auth(x_internal_api_key: str | None = Header(default=None)) -> None:
    if not settings.internal_api_key:
        return
    if x_internal_api_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Not authenticated.")
