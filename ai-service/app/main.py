from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import extraction, health

app = FastAPI(title="ai-service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    print(f"Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"error": "Something went wrong. Please try again."})


app.include_router(health.router, prefix="/api")
app.include_router(extraction.router, prefix="/api")
