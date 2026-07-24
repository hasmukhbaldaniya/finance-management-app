# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Node.js + Express 5 + TypeScript service (`strict: true`, `moduleResolution: nodenext`) — **no database of its own**. Phase 5 of `docs/PLANS/microservices-plan.md` (`user-stories/028-reports.md`), it builds every report by forwarding the caller's own session cookie to `auth-service`'s and `claim-service`'s own org-wide read endpoints and aggregating the results in memory (`src/services/upstream-client.ts`'s `fetchAllPages` — a safety-bounded pagination loop, see its own doc comment for the cap).

**Access control is not enforced locally** — `claim-service`'s `/api/claims/org`/`/api/trips/org`/`/api/expenses/org` are all `requireOwner`-gated already; if the caller isn't an org owner, those calls 403 and `src/middleware/error-handler.ts`'s `UpstreamError` handling propagates that same 403 back, rather than this service duplicating an authorization check it doesn't need to.

**Deliberately has zero dependency on the Approvals epic** (`user-stories/029-claim-trip-approvals.md`, currently on hold) — no report here reads `pending_for_approval`/`ready_for_submission`/`approved_for_reimbursement`/`Trip.approvedAmount`.

## Adding a new report

1. Add a client function to `src/services/claim-service.client.ts` or `auth-service.client.ts` if the report needs a new upstream endpoint.
2. Add a handler to `src/controllers/reports.controller.ts` and a route in `src/routes/reports.routes.ts`.
3. Add the corresponding `frontend/src/apis/reports/*.api.ts` client + UI.

No other file needs touching — there is no per-report config beyond the route itself.

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply. This file only tracks decisions specific to this service.
