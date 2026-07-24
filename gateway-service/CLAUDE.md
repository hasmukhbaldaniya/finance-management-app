# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Node.js + Express 5 + TypeScript API gateway (`strict: true`, `moduleResolution: nodenext`) — no database, no business logic. It's the single browser-facing origin in front of `auth-service`, `claim-service`, and `reports-service`, implementing the design in `../docs/PLANS/microservices-frontend-integration-plan.md` section 1. It reads each request's path and forwards it byte-for-byte (headers, cookies, body) to whichever service owns that prefix — the routing table in `src/routes/proxy-routes.ts` must stay in sync with that plan doc's section 1.2, since silent drift there produces a 404 with no compile-time signal (the plan's own "Risks" section flags this).

Deliberately does **not** parse the request body (no `express.json()`) — parsing would consume the stream before `http-proxy-middleware` can forward it, and each downstream service already parses its own body. Deliberately does **not** verify JWTs — every service behind the gateway verifies the shared `JWT_SECRET` independently (see the plan doc's section 1.3 for why).

Path matching is done manually against `req.path` (`app.ts`'s `matchesPrefix`) rather than via `app.use(prefix, proxyMiddleware)`, since Express strips the mount prefix before the middleware sees the request — mounting at the root and matching manually keeps every path completely unchanged end to end, which is the entire point of this service (frontend `src/apis/**/*.api.ts` files need zero code changes).

## Adding a new route prefix

1. Add the prefix to the correct array in `src/routes/proxy-routes.ts` (`AUTH_SERVICE_PATHS`, `CLAIM_SERVICE_PATHS`, or `REPORTS_SERVICE_PATHS`).
2. That's it — no other file needs touching. There is no per-route config, only the prefix lists and the matching `createProxyMiddleware` instances in `app.ts`.

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply. This file only tracks decisions specific to this service.
