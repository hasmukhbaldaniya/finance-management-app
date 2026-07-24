# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`ai-service` is a small, standalone **Python + FastAPI** microservice — the AI/ML extraction backend for Claim Management's Automated Extraction flow (`user-stories/023-claim-creation-ai-powered.md`). It exists as its own process (own `pyproject.toml`/`uv.lock`, own port, own `.env`) rather than a module inside `backend/`, per explicit instruction: an earlier version inlined this logic directly into `backend`'s own request handling; that was pulled out into a separate Node.js service first, then **rewritten from Node/TypeScript to Python** on top of that, per a later explicit instruction that Python is the better fit for AI/ML work — the official Anthropic SDK and the wider ecosystem both assume Python first, and this is the one piece of the stack that's actually about AI/ML rather than general CRUD.

**It was deliberately stateless until Phase 4 of `docs/PLANS/microservices-plan.md`** — no database, no ORM, no session/auth beyond a single shared-secret check. Given one invoice document (an image, or a PDF — one page or several merged pages, built by `claim-service`'s own `pdf-lib` usage) plus the organization's active+enabled categories (name/description/field config), it calls a real vision-capable LLM (Anthropic Claude, via the official `anthropic` Python SDK) and returns which category best matches, the field values it could read, and any AI-mode red-flag verdicts. **That's still true of the extraction itself** — `app/services/anthropic_extraction.py` is unchanged. What changed: this service now **owns its own audit trail**, `AiExtractionLog`, in its own MySQL database — `claim-service`'s `claim-ai.controller.ts` (the only caller) used to write that table itself after each call; now this service writes it around its own `/api/extract` call, since the audit-log responsibility always conceptually belonged to whichever service actually performs the extraction, it just couldn't own it while it had no database.

**The wire contract with `claim-service` is unchanged from the Node.js version, except for two new fields** — same `GET /api/health`, same `POST /api/extract` request/response shape (now also taking `claimInvoiceFileId`/`pageNumber`, the correlation keys this service needs to write its own log row), same port (4100) by default, same optional `X-Internal-Api-Key` shared-secret header. The extraction *result* payload returned to the caller is byte-identical to before — only the logging side-effect and the two new request fields are new.

## Common Commands

Dependency management is via [`uv`](https://docs.astral.sh/uv/), not `pip`/`venv` directly:
```
uv sync            # install/sync dependencies from pyproject.toml + uv.lock
uv run python run.py   # dev server, auto-restarts on change (uvicorn --reload), port from .env
uv run alembic upgrade head          # apply DB migrations (MySQL, see docker-compose.yml's mysql-ai)
uv run alembic revision --autogenerate -m "..."   # generate a new migration after changing app/db_models.py
```
No test runner configured yet. Env vars load via `python-dotenv`/`pydantic-settings` — see `.env.example`; never commit `.env`. Requires this service's own MySQL running (`docker-compose.yml`'s `mysql-ai` service, port `3307`).

**Watch out when restarting `backend` and `ai-service` together** — they're different runtimes now (`ts-node-dev` vs. `uvicorn`), so a `pkill` pattern matching one won't accidentally kill the other anymore (this used to be a real footgun when both were Node processes running the identical `ts-node-dev --respawn --transpile-only src/server.ts` command — no longer applicable, but check `lsof -i :4000`/`:4100` before assuming either is/isn't running).

## Architecture

```
app/
├── main.py                          # FastAPI app: CORS, error-shape handlers, mounts routers under /api
├── config.py                        # Settings (pydantic-settings): PORT, CORS_ORIGIN, ANTHROPIC_API_KEY, AI_MODEL, INTERNAL_API_KEY, MYSQL_*
├── models.py                        # Pydantic request/response models — the wire contract with claim-service
├── dependencies.py                  # require_internal_auth — optional shared-secret check
├── db.py                            # SQLAlchemy engine/session (MySQL) — get_session()
├── db_models.py                     # AiExtractionLog (SQLAlchemy) — this service's one table
├── routers/
│   ├── health.py                    # GET /api/health — also reports aiConfigured
│   ├── extraction.py                # POST /api/extract — writes its own AiExtractionLog row now (Phase 4)
│   └── logs.py                      # GET /api/extraction-logs — status/dedup reads for claim-service
└── services/
    └── anthropic_extraction.py      # the actual Claude call — tool-forced structured output
alembic/                              # DB migrations (MySQL) — versions/, env.py wired to app.config.settings
run.py                                # dev entrypoint (uvicorn --reload, port from Settings)
```

**Every Pydantic model in `models.py` uses camelCase field names, not Python's usual snake_case** — deliberate, not an oversight: these are the exact JSON keys `claim-service`'s own `ai-extraction.service.ts` HTTP client sends/expects (`documentBase64`, `suggestedCategoryId`, etc.), and matching them directly is simpler than fighting Pydantic aliases in both directions. `db_models.py`'s `AiExtractionLog` follows the opposite, standard Python convention (`snake_case` attribute names) since it's this service's own internal SQLAlchemy model, not part of the wire contract — each column maps to the original camelCase DB column name explicitly (e.g. `claim_invoice_file_id: Mapped[int] = mapped_column("claimInvoiceFileId", ...)`) so the schema itself stays byte-identical to what it was in Postgres.

**`ANTHROPIC_API_KEY` has no default — unset means every `/api/extract` call returns `{"error": "... not configured"}` instead of throwing or faking a result.** This is deliberate graceful degradation, not a bug: `claim-service`'s `claim-ai.controller.ts` treats that response exactly like any other failed extraction (the resulting `Expense` arrives blank, ready for manual fill-in) — and this service's own log row is still written with `status: "failed"` regardless, since `routers/extraction.py` always finalizes the log whether the extraction succeeded, failed, or threw.

**Every error response uses a flat `{"error": string}` shape, not FastAPI's own defaults** (a bare `"detail"` string for `HTTPException`, or a `"detail"` array for validation errors) — `main.py` registers exception handlers overriding both, plus a catch-all for unhandled exceptions, so this service's responses stay consistent with the `{ error }` convention `claim-service` and `frontend` already use everywhere.

**The model is asked for the matched category and each field by name, not by numeric id** (it has no idea what this org's database ids are) — `anthropic_extraction.py` resolves both back to real ids from the `categories` array it was given before responding, so `claim-service` never has to redo that matching.

**`requireInternalAuth`'s Python equivalent (`dependencies.py`'s `require_internal_auth`) is opt-in** — if `INTERNAL_API_KEY` is unset (the default for local dev), every request is allowed through; set the same value here and as `AI_SERVICE_INTERNAL_API_KEY` in `claim-service/.env` before running this service anywhere reachable beyond localhost. There is exactly one legitimate caller (`claim-service`), so this is a shared secret, not a real multi-tenant auth scheme.

### `AiExtractionLog` — moved here from claim-service's Postgres in Phase 4, in its own MySQL database

`db_models.py`'s `AiExtractionLog` is this service's one table, in its own MySQL database
(`docker-compose.yml`'s `mysql-ai`, port `3307`) — MySQL specifically per explicit instruction, not a
technical requirement of the AI/ML work itself. It was migrated here via `pg_dump --data-only` from
the original Postgres table, transformed row-by-row into this schema (a one-off script, since deleted
— not part of the running app); every row's id and data was verified to match the source exactly
before cutover.

**`claimInvoiceFileId`, `expenseId`, and `suggestedCategoryId` are all plain, unenforced integer
columns, not real foreign keys** — they point at `claim-service`'s own `ClaimInvoiceFile`/`Expense`/
`Category` tables, and a FK constraint can't span two different databases on two different engines.
**Correlating a log row back to a `Claim`/`Expense` is done by matching `claimInvoiceFileId` +
`pageNumber`** (both sides already have this — `claim-service`'s own `Expense` carries
`sourceInvoiceFileId`/`sourcePageNumber`), not by this service tracking a live `expenseId` that
`claim-service` would otherwise have to write back after the fact — that would need a synchronous
"tell this service which Expense resulted" round trip in the write path, which this design avoids.
**A real, accepted consequence**: an orphaned log row (its `ClaimInvoiceFile`/`Expense` deleted in
`claim-service`) is now possible with no database constraint to prevent or even flag it — worth a
periodic reconciliation check if audit-trail completeness ever matters for compliance.

**This service now owns the entire `pending` → `completed`/`failed` lifecycle for every extraction it
performs** — `routers/extraction.py`'s `/extract` handler creates the log row before calling
`anthropic_extraction.py`, then always finalizes it (`completed` with the real result, or `failed`
with the error message) regardless of outcome, including an unexpected exception. `claim-service` no
longer writes to this table at all; it only reads from `routers/logs.py`'s `GET /api/extraction-logs?
claimInvoiceFileIds=1,2,3` — used both for `runExtractionForClaim`'s "already logged, skip
re-processing" dedup check and `getProcessingStatus`'s polling, replacing what used to be a local
`AiExtractionLog.findAll` query on the other side of the HTTP boundary.

**PDF documents are sent to Claude natively, never rasterized to an image** — `backend` builds a standalone single/merged-page PDF via `pdf-lib` and sends it as a `document` content block (`media_type: "application/pdf"`); only `.jpg`/`.jpeg`/`.png` sources are sent as `image` blocks. This avoids needing any rasterization dependency in either service.

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply (security). See root `CLAUDE.md` for repo-wide context, and `claim-service/CLAUDE.md`'s "Claim Management" section for how `claim-ai.controller.ts` consumes this service. This is the one Python codebase in the monorepo — don't assume `frontend`'s/`claim-service`'s/`auth-service`'s TypeScript conventions (strict typing style, React prop naming, etc.) apply here; standard Python/FastAPI/SQLAlchemy idioms apply instead (type hints via Pydantic, `snake_case` for anything that isn't part of the JSON wire contract, `ruff`/`black`-style formatting if a linter is added later).
