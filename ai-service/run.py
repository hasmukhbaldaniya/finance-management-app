import uvicorn

from app.config import settings

# The dev entrypoint — mirrors `npm run dev`'s "auto-restart on change"
# behavior via uvicorn's own --reload, just invoked from Python so the port
# comes from Settings (and therefore .env) instead of a hardcoded CLI flag.
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=True)
