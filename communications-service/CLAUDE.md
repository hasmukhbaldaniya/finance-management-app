# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`communications-service` is a standalone **Node.js + Express 5 + TypeScript** microservice — the
first service extracted per `docs/PLANS/microservices-plan.md`'s Phase 1. It owns exactly one
concern: delivering a notification (email today, WhatsApp once a real provider is chosen) and
logging every attempt, regardless of outcome. It is deliberately **not** where email/WhatsApp copy
gets written — callers (today: `backend`; eventually: `auth-service`/`claim-service`) build the
actual subject/body text themselves and hand this service a fully-formed message to deliver, the
same "one well-defined place that talks to the provider" split `ai-service` already established for
AI/ML calls.

This service replaces three separate SMTP-sending files that used to live in `backend`
(`src/utils/mailer.ts`, `src/utils/employee-invite-mailer.ts`, `src/utils/split-request-mailer.ts` —
each had its own copy of the identical `nodemailer` transporter setup) plus the mobile-OTP SMS stub
(`src/utils/sms.ts`). `backend` now calls this service over HTTP instead
(`src/services/communications.service.ts`) — see `backend/CLAUDE.md`.

**WhatsApp has no real provider wired up yet, by explicit decision** — `sendWhatsApp`
(`src/services/whatsapp.service.ts`) is a `console.log` dev stub, the same posture `backend`'s old
`sms.ts` had. Every stubbed send is still logged to `NotificationLog` with `status: "stubbed"`
(distinct from `"sent"`/`"failed"`) so a log listing can't be misread as real delivery history. Swap
that one function's body for a real provider (Twilio, Meta Cloud API, MSG91, etc.) once one is
chosen — nothing else needs to change, since every caller already goes through
`notification.controller.ts`.

## Common Commands

```
npm run dev     # ts-node-dev, auto-restart on change
npm run build && npm start   # compile to dist/ and run
```
No lint script and no test runner configured yet (`npm test` is a stub that exits 1), matching
`backend`'s own current state. Env vars load via `dotenv` — see `.env.example`; never commit `.env`.
Requires a running MongoDB instance (`MONGO_URI`).

## Architecture

```
src/
├── app.ts                          # Express app: helmet, cors, morgan, mounts apiRouter under /api
├── server.ts                       # connects Mongo, then starts listening
├── config/env.ts                   # Settings — PORT, CORS_ORIGIN, MONGO_URI, SMTP_*, INTERNAL_API_KEY
├── db/mongoose.ts                  # connectMongo()
├── models/notification-log.model.ts # NotificationLog (Mongoose) — the one collection this service owns
├── middleware/
│   ├── require-internal-auth.ts    # optional X-Internal-Api-Key shared-secret check
│   └── error-handler.ts            # same { error } shape backend/frontend already use everywhere
├── controllers/
│   ├── health.controller.ts        # GET /api/health — also reports mongoConnected
│   └── notification.controller.ts  # POST /api/notifications/email, /whatsapp
├── services/
│   ├── email.service.ts            # the one nodemailer transporter (moved from backend)
│   └── whatsapp.service.ts         # stub — see above
└── routes/                          # health.routes.ts, notification.routes.ts, index.ts
```

**`NotificationLog` is one Mongo collection for every channel, discriminated by `channel`** —
`"email" | "whatsapp"` — the same "one table/collection, discriminant column" shape
`backend/CLAUDE.md`'s `Otp` model already uses for its own multiple purposes (password reset, email
verification, mobile verification), applied here to Mongo instead of Postgres. Fields:
`channel`, `to`, `subject` (nullable — only email has one), `body`, `status`
(`"sent" | "failed" | "stubbed"`), `providerResponse` (whatever the provider call returned, e.g.
nodemailer's own `info` object), `errorMessage` (nullable), `requestedAt`/`respondedAt` (mirrors
`AiExtractionLog`'s own request/response timestamp pair, see `backend/CLAUDE.md`'s Claim Management
section), plus Mongoose's own `timestamps: true` `createdAt`/`updatedAt`.

**Email failures are re-thrown as an HTTP `502` with the underlying error message, not swallowed** —
matching this codebase's existing "send failures currently throw straight out of the controller"
posture (`backend/CLAUDE.md`'s Overview) so callers don't need new error-handling logic, just a
different thing being called. `SMTP_USER`/`SMTP_PASSWORD` have no fallback and the app throws at
startup if either is unset — the same fail-fast posture `backend/src/config/env.ts` already had for
these two vars before this service existed.

**`requireInternalAuth` is opt-in**, mirroring `ai-service`'s own `require_internal_auth`
(`app/dependencies.py`) almost exactly: if `INTERNAL_API_KEY` is unset (the default for local dev),
every request is allowed through; set the same value here and as the calling service's own shared-
secret env var before running this service anywhere reachable beyond localhost. There is exactly one
kind of legitimate caller (another internal service), never a browser.

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply (TypeScript strictness, security). See root `CLAUDE.md`
for repo-wide context, and `backend/CLAUDE.md` for how `communications.service.ts` (the HTTP client
living in `backend`) consumes this service.
