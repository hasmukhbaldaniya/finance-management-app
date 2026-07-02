# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Node.js + Express 5 + TypeScript backend (`strict: true`, `moduleResolution: nodenext`), ORM Sequelize over PostgreSQL (`pg`/`pg-hstore`). Early-stage skeleton — one model (`User`), one health-check route, no auth, no service/repository layer.

## Common Commands

```
npm run dev                   # ts-node-dev, auto-restart on change
npm run build && npm start    # compile to dist/ and run
npm run migrate               # sequelize-cli db:migrate
npm run migrate:undo          # sequelize-cli db:migrate:undo
npm run seed                  # sequelize-cli db:seed:all
```
There is no lint script and no test runner configured yet (`npm test` is a stub that exits 1) — don't assume Jest/Vitest config exists. Env vars are loaded via `dotenv` — see `.env.example`; never commit `.env`. Requires Postgres running (see root `CLAUDE.md` / `docker-compose.yml`).

## Architecture

Structure: `src/{config,models,controllers,routes,middleware,migrations,seeders}`.

### Request flow
`src/server.ts` calls `sequelize.authenticate()` then `createApp()` from `src/app.ts`, which wires middleware (helmet, cors, morgan, json body parsing) and mounts `apiRouter` under `/api`. Routing fans out through `src/routes/index.ts` → per-resource router (e.g. `health.routes.ts`) → controller function in `src/controllers/`. Controllers are plain functions `(req, res) => void` — no service/repository layer exists yet; as more resources are added, follow the same routes → controller → model shape unless the task calls for a new layer. Errors fall through to `notFoundHandler`/`errorHandler` in `src/middleware/error-handler.ts` (registered last in `app.ts`), which return JSON `{ error }` shapes.

### Two separate config sources — keep them in sync manually
DB connection settings are defined **twice** and must be kept consistent by hand:
- `src/config/env.ts` — reads `process.env` via `dotenv`, used by the app at runtime (`server.ts`, `config/database.ts`).
- `src/config/config.js` — plain JS read directly by `sequelize-cli` (per `.sequelizerc`), since the CLI doesn't run through ts-node.

If you add a new env var the app needs, decide whether `config.js` also needs it (only required for values Sequelize CLI itself uses, i.e. DB connection params).

### Models and migrations
Migrations/seeders are plain `.js` (CLI-only, see `.sequelizerc`); models and all other app code are `.ts`. Columns are camelCase end-to-end (`createdAt`/`updatedAt`, not snake_case) — migrations and `Model.init()` column defs must match exactly, and there's no `underscored: true` anywhere. New models: add a migration in `src/migrations/`, define the class in `src/models/`, then re-export it from `src/models/index.ts` (see `user.model.ts` for the `InferAttributes`/`InferCreationAttributes`/`CreationOptional` pattern).

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply (TypeScript strictness, security). See root `CLAUDE.md` for repo-wide context.
