import time
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import extraction, health, logs

app = FastAPI(title="ai-service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# This is a leaf service (its only outbound call is the external Anthropic
# API, not another internal service), so it just needs to reuse whichever
# request-id claim-service forwarded — or mint one if called directly — and
# put it in this service's own access log, so a slow/failed extraction can
# be traced back to the same chain claim-service's own logs show.
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    incoming = request.headers.get("x-request-id")
    request_id = incoming if incoming and incoming.strip() else str(uuid.uuid4())
    request.state.request_id = request_id

    start = time.monotonic()
    response = await call_next(request)
    duration_ms = round((time.monotonic() - start) * 1000, 1)

    response.headers["x-request-id"] = request_id
    print(f"{request_id} {request.method} {request.url.path} {response.status_code} {duration_ms}ms")
    return response


# Every error response across this app (and the main Node.js backend) uses
# a flat { "error": string } JSON shape — these three handlers replace
# FastAPI's own default shapes (a bare "detail" string/array) so this
# service's responses stay consistent with that convention rather than
# needing the backend's HTTP client to understand two different shapes.
@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, _exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"error": "Invalid extraction request."})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "-")
    print(f"{request_id} Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"error": "Something went wrong. Please try again."})


app.include_router(health.router, prefix="/api")
app.include_router(extraction.router, prefix="/api")
app.include_router(logs.router, prefix="/api")
