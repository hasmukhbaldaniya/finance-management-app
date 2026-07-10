# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`ai-service` is a small, standalone **Python + FastAPI** microservice — the AI/ML extraction backend for Claim Management's Automated Extraction flow (`user-stories/023-claim-creation-ai-powered.md`). It exists as its own process (own `pyproject.toml`/`uv.lock`, own port, own `.env`) rather than a module inside `backend/`, per explicit instruction: an earlier version inlined this logic directly into `backend`'s own request handling; that was pulled out into a separate Node.js service first, then **rewritten from Node/TypeScript to Python** on top of that, per a later explicit instruction that Python is the better fit for AI/ML work — the official Anthropic SDK and the wider ecosystem both assume Python first, and this is the one piece of the stack that's actually about AI/ML rather than general CRUD.

**It is deliberately stateless.** No database connection, no ORM models, no session/auth beyond a single shared-secret check. Given one invoice document (an image, or a PDF — one page or several merged pages, built by `backend`'s own `pdf-lib` usage) plus the organization's active+enabled categories (name/description/field config), it calls a real vision-capable LLM (Anthropic Claude, via the official `anthropic` Python SDK) and returns which category best matches, the field values it could read, and any AI-mode red-flag verdicts. `backend`'s `claim-ai.controller.ts` is the only caller, and it — not this service — owns writing every call to `AiExtractionLog` (this service's own response is just data; it has no audit trail of its own to maintain).

**The wire contract with `backend` is unchanged from the Node.js version** — same `GET /api/health`, same `POST /api/extract` request/response shape, same port (4100) by default, same optional `X-Internal-Api-Key` shared-secret header. Rewriting the implementation language required zero changes on the `backend` side; this is the whole point of the two talking over a plain HTTP boundary instead of sharing code.

## Common Commands

Dependency management is via [`uv`](https://docs.astral.sh/uv/), not `pip`/`venv` directly:
```
uv sync            # install/sync dependencies from pyproject.toml + uv.lock
uv run python run.py   # dev server, auto-restarts on change (uvicorn --reload), port from .env
```
No test runner configured yet. Env vars load via `python-dotenv`/`pydantic-settings` — see `.env.example`; never commit `.env`.

**Watch out when restarting `backend` and `ai-service` together** — they're different runtimes now (`ts-node-dev` vs. `uvicorn`), so a `pkill` pattern matching one won't accidentally kill the other anymore (this used to be a real footgun when both were Node processes running the identical `ts-node-dev --respawn --transpile-only src/server.ts` command — no longer applicable, but check `lsof -i :4000`/`:4100` before assuming either is/isn't running).

## Architecture

```
app/
├── main.py                          # FastAPI app: CORS, error-shape handlers, mounts routers under /api
├── config.py                        # Settings (pydantic-settings): PORT, CORS_ORIGIN, ANTHROPIC_API_KEY, AI_MODEL, INTERNAL_API_KEY
├── models.py                        # Pydantic request/response models — the wire contract with backend
├── dependencies.py                  # require_internal_auth — optional shared-secret check
├── routers/
│   ├── health.py                    # GET /api/health — also reports aiConfigured
│   └── extraction.py                # POST /api/extract — the one real endpoint
└── services/
    └── anthropic_extraction.py      # the actual Claude call — tool-forced structured output
run.py                                # dev entrypoint (uvicorn --reload, port from Settings)
```

**Every Pydantic model in `models.py` uses camelCase field names, not Python's usual snake_case** — deliberate, not an oversight: these are the exact JSON keys `backend`'s own `ai-extraction.service.ts` HTTP client sends/expects (`documentBase64`, `suggestedCategoryId`, etc.), and matching them directly is simpler than fighting Pydantic aliases in both directions. Kept in sync by hand across the two codebases, the same convention this monorepo already uses for shared constants between `frontend`/`backend`.

**`ANTHROPIC_API_KEY` has no default — unset means every `/api/extract` call returns `{"error": "... not configured"}` instead of throwing or faking a result.** This is deliberate graceful degradation, not a bug: `backend`'s `claim-ai.controller.ts` treats that response exactly like any other failed extraction (the resulting `Expense` arrives blank, ready for manual fill-in, and the attempt is still logged to `AiExtractionLog` with `status: "failed"`) — verified end-to-end during implementation, including the actual Node→Python HTTP round trip, with no key configured.

**Every error response uses a flat `{"error": string}` shape, not FastAPI's own defaults** (a bare `"detail"` string for `HTTPException`, or a `"detail"` array for validation errors) — `main.py` registers exception handlers overriding both, plus a catch-all for unhandled exceptions, so this service's responses stay consistent with the `{ error }` convention both `backend` and `frontend` already use everywhere.

**The model is asked for the matched category and each field by name, not by numeric id** (it has no idea what this org's database ids are) — `anthropic_extraction.py` resolves both back to real ids from the `categories` array it was given before responding, so `backend` never has to redo that matching.

**`requireInternalAuth`'s Python equivalent (`dependencies.py`'s `require_internal_auth`) is opt-in** — if `INTERNAL_API_KEY` is unset (the default for local dev), every request is allowed through; set the same value here and as `AI_SERVICE_INTERNAL_API_KEY` in `backend/.env` before running this service anywhere reachable beyond localhost. There is exactly one legitimate caller (`backend`), so this is a shared secret, not a real multi-tenant auth scheme.

**PDF documents are sent to Claude natively, never rasterized to an image** — `backend` builds a standalone single/merged-page PDF via `pdf-lib` and sends it as a `document` content block (`media_type: "application/pdf"`); only `.jpg`/`.jpeg`/`.png` sources are sent as `image` blocks. This avoids needing any rasterization dependency in either service.

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply (security). See root `CLAUDE.md` for repo-wide context, and `backend/CLAUDE.md`'s "Claim Management" section for how `claim-ai.controller.ts` consumes this service. This is the one Python codebase in the monorepo — don't assume `frontend`'s or `backend`'s TypeScript conventions (strict typing style, React prop naming, etc.) apply here; standard Python/FastAPI idioms apply instead (type hints via Pydantic, `snake_case` for anything that isn't part of the JSON wire contract, `ruff`/`black`-style formatting if a linter is added later).
