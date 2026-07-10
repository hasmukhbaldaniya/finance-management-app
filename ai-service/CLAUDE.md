# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`ai-service` is a small, standalone Node.js + Express 5 + TypeScript microservice — the AI/ML extraction backend for Claim Management's Automated Extraction flow (`user-stories/023-claim-creation-ai-powered.md`). It exists as its own process (own `package.json`, own port, own `.env`) rather than a module inside `backend/`, per explicit instruction: an earlier version inlined this logic directly into `backend`'s own request handling, which didn't match what was actually asked for ("create one separate service for AI ML").

**It is deliberately stateless.** No database connection, no models, no session/auth beyond a single shared-secret check. Given one invoice document (an image, or a PDF — one page or several merged pages, built by `backend`'s own `pdf-lib` usage) plus the organization's active+enabled categories (name/description/field config), it calls a real vision-capable LLM (Anthropic Claude, via `@anthropic-ai/sdk`) and returns which category best matches, the field values it could read, and any AI-mode red-flag verdicts. `backend`'s `claim-ai.controller.ts` is the only caller, and it — not this service — owns writing every call to `AiExtractionLog` (this service's own response is just data; it has no audit trail of its own to maintain).

## Common Commands

```
npm run dev      # ts-node-dev, auto-restart on change, port 4100 by default
npm run build     # compile to dist/
npm start         # run the compiled build
```
No test runner configured yet. Env vars load via `dotenv` — see `.env.example`; never commit `.env`.

**Watch out when restarting `backend` and `ai-service` together** — both run the identical `ts-node-dev --respawn --transpile-only src/server.ts` command, so a broad `pkill -f "ts-node-dev.*server.ts"` (or `pkill -f "next dev"`-style pattern reused carelessly) kills both. Target one at a time, or check `lsof -i :4000`/`:4100` before and after.

## Architecture

```
src/
├── server.ts                          # listens on env.port
├── app.ts                             # express app factory (helmet, cors, morgan, json — 20mb limit, not the default 100kb, since a base64 invoice runs well past that)
├── config/env.ts                      # PORT, CORS_ORIGIN, ANTHROPIC_API_KEY, AI_MODEL, INTERNAL_API_KEY
├── middleware/
│   ├── error-handler.ts               # same { error } shape as backend's own
│   └── require-internal-auth.ts       # optional shared-secret check (X-Internal-Api-Key)
├── controllers/
│   ├── health.controller.ts           # GET /api/health — also reports aiConfigured
│   └── extraction.controller.ts       # POST /api/extract — the one real endpoint
├── services/anthropic-extraction.ts   # the actual Claude call — tool-forced structured output
├── routes/
└── types.ts                           # the wire contract with backend's own client
```

**`ANTHROPIC_API_KEY` has no fallback — unset means every `/api/extract` call returns `{ error: "... not configured" }` instead of throwing or faking a result.** This is deliberate graceful degradation, not a bug: `backend`'s `claim-ai.controller.ts` treats that response exactly like any other failed extraction (the resulting `Expense` arrives blank, ready for manual fill-in, and the attempt is still logged to `AiExtractionLog` with `status: "failed"`) — verified end-to-end during implementation with no key configured.

**`POST /api/extract`'s request/response shapes are the actual contract** (`src/types.ts`) — kept in sync by hand with `backend/src/services/ai-extraction.service.ts` (the HTTP client on the other side), the same "two copies, kept in sync manually" convention this monorepo already uses for shared constants between `frontend`/`backend`. The model is asked for the matched category and each field **by name**, not by numeric id (it has no idea what this org's database ids are) — this service resolves both back to real ids from the `categories` array it was given before returning, so `backend` never has to redo that matching.

**`requireInternalAuth` is opt-in** — if `INTERNAL_API_KEY` is unset (the default for local dev), every request is allowed through; set the same value here and as `AI_SERVICE_INTERNAL_API_KEY` in `backend/.env` before running this service anywhere reachable beyond localhost. There is exactly one legitimate caller (`backend`), so this is a shared secret, not a real multi-tenant auth scheme.

**PDF documents are sent to Claude natively, never rasterized to an image** — `backend` builds a standalone single/merged-page PDF via `pdf-lib` and sends it as a `document` content block (`media_type: "application/pdf"`); only `.jpg`/`.jpeg`/`.png` sources are sent as `image` blocks. This avoids needing any rasterization dependency in either service.

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply (TypeScript strictness, security). See root `CLAUDE.md` for repo-wide context, and `backend/CLAUDE.md`'s "Claim Management" section for how `claim-ai.controller.ts` consumes this service.
