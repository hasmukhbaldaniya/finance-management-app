# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Finance Management is three independent apps in one repo with no shared workspace tooling — `frontend/`, `backend/`, and `ai-service/` each have their own `package.json`/lockfile, installed and run separately with npm, and their own `CLAUDE.md` (`backend/CLAUDE.md`, `frontend/CLAUDE.md`, `ai-service/CLAUDE.md`) with service-specific commands and architecture. There is no root `package.json`. The codebase started as an early-stage skeleton (one model, one health-check route, no auth, no tests) and has grown a real feature set since — don't assume conventions beyond what's actually present in the relevant service's own `CLAUDE.md`; check for the nearest real example before inventing a pattern.

Backend runs on `http://localhost:4000`, frontend on `http://localhost:3000`, the AI/ML extraction microservice (`ai-service/`, Claim Management's Automated Extraction flow) on `http://localhost:4100`. `ai-service` is called only by `backend` over plain HTTP (`AI_SERVICE_URL` in `backend/.env`) — it's a standalone process with its own `ANTHROPIC_API_KEY`, not a module inside `backend/`, added at explicit request when an earlier in-process implementation didn't match what was actually asked for. It has no database of its own; the backend still owns `AiExtractionLog` and every other Claim Management table.

## Database

```
docker compose up -d          # start local Postgres (from repo root)
```
Database name/user/password must match `backend/.env` (copy from `backend/.env.example`).

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply (TypeScript strictness, React prop conventions, accessibility, security, commit style). This file only tracks decisions specific to this project's stack.
