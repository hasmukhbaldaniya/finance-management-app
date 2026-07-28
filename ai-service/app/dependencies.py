from fastapi import Header, HTTPException

from app.config import settings


# A lightweight shared-secret check for the one caller this service ever
# expects (the main backend). Fails closed if internal_api_key isn't
# configured — an unset key must never be treated as "no check needed",
# since that would leave these routes open to anyone. Set the same value
# on both sides before running this service anywhere, including localhost.
async def require_internal_auth(x_internal_api_key: str | None = Header(default=None)) -> None:
    if not settings.internal_api_key or x_internal_api_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Not authenticated.")
