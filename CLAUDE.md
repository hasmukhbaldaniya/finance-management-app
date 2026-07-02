# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Finance Management is two independent apps in one repo with no shared workspace tooling — `frontend/` and `backend/` each have their own `package.json`/lockfile, installed and run separately with npm, and their own `CLAUDE.md` (`backend/CLAUDE.md`, `frontend/CLAUDE.md`) with service-specific commands and architecture. There is no root `package.json`. The codebase is an early-stage skeleton (one model, one health-check route, no auth, no tests wired up yet), so don't assume conventions beyond what's actually present — check for the nearest real example before inventing a pattern.

Backend runs on `http://localhost:4000`, frontend on `http://localhost:3000`.

## Database

```
docker compose up -d          # start local Postgres (from repo root)
```
Database name/user/password must match `backend/.env` (copy from `backend/.env.example`).

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply (TypeScript strictness, React prop conventions, accessibility, security, commit style). This file only tracks decisions specific to this project's stack.
