# Finance Management — Desktop

The Electron + Rust desktop client for Finance Management. It's a full desktop counterpart to
[`frontend/`](../frontend) — the same screens, the same backend, the same accounts — packaged as a
native macOS app instead of a browser tab.

It talks to the same `gateway-service` every other app in this monorepo talks to. It doesn't have
its own backend, its own database, or its own auth — log in with the same account you'd use on the
web app.

## Documentation map

This project has four docs, each with a different job — don't duplicate content across them:

| File | Audience | Purpose |
| --- | --- | --- |
| **README.md** (this file) | Anyone | What this is, quick start, where to look next |
| [`SKILLS.md`](./SKILLS.md) | A developer new to this stack | Prerequisite knowledge — what to know or learn before touching this code |
| [`DEVELOPMENT.md`](./DEVELOPMENT.md) | A developer working on this code | Tech stack, folder structure, architecture, day-to-day dev workflow |
| [`CLAUDE.md`](./CLAUDE.md) | Claude Code / AI agents | Conventions and porting rules for AI-assisted changes to this codebase |

## Quick start

Requires macOS on Apple Silicon (arm64), Node 22.19.0, and a Rust toolchain (`rustc`/`cargo`) —
see [`SKILLS.md`](./SKILLS.md) if any of that is unfamiliar and [`DEVELOPMENT.md`](./DEVELOPMENT.md)
for full prerequisite details.

```bash
cd desktop
nvm use                # picks up .nvmrc (22.19.0)
npm install             # also builds the Rust addon via the postinstall hook
npm run dev             # opens the Electron window with hot reload
```

You'll also need the backend running — at minimum `gateway-service` and `auth-service` (see the
[root `CLAUDE.md`](../CLAUDE.md) for how to start every service and database). Point the app at your
gateway via `desktop/.env` (see `.env.example`); it defaults to `http://localhost:4400/api`.

Log in with the same account you'd use on `frontend/` at `http://localhost:3000` — it's the same
backend and the same session cookies, just held in the desktop app's own persistent Electron session
instead of a browser tab.

## What's in the box

Every real screen `frontend/` has: login, forgot password, dashboard reports, profile, help, all of
company settings (grades, departments, roles, associated organizations, employees + bulk invite),
categories (the 4-step wizard), trips, claims (manual and AI-assisted), and the pre-account flows
(register, onboarding). See [`DEVELOPMENT.md`](./DEVELOPMENT.md#architecture) for how it's wired
together.

## Building a release

```bash
npm run build:mac      # produces a .dmg and .zip under dist/ (arm64 only, see CLAUDE.md)
```

## Learn more

- New to this stack (Electron, Rust, this specific setup)? Start with [`SKILLS.md`](./SKILLS.md).
- Working on a feature or fixing a bug? [`DEVELOPMENT.md`](./DEVELOPMENT.md) has the full folder
  structure, architecture, and workflow.
- Using Claude Code on this project? It already reads [`CLAUDE.md`](./CLAUDE.md) automatically.
