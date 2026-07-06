# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Node.js + Express 5 + TypeScript backend (`strict: true`, `moduleResolution: nodenext`), ORM Sequelize over PostgreSQL (`pg`/`pg-hstore`). Implements login/forgot-password (`user-stories/001-authentication.md`), company registration (`user-stories/002-organization-signup.md`), the header navigation's switch-organization feature (`user-stories/003-header-navigation.md`), Grade Management (`user-stories/004-grade-management.md`), and Department Management (`user-stories/005-department-management.md`) — no service/repository layer yet, controllers talk to models directly.

Models: `User` (`firstName`/`lastName` stored separately from the display `name`, `emailVerifiedAt`/`mobileVerifiedAt`/`registrationCompletedAt` timestamps, `activeOrganizationId` — nullable FK to `organizations`, see "Active organization" below), `Organization`, `OrganizationMember` (the many-to-many join table — every user belongs to ≥1 organization via this table, never a scalar FK on `User`; also carries nullable `gradeId`/`departmentId` columns, one per org-scoped CRUD resource — see "Org-scoped CRUD resources" below), `Otp` (a single generalized table for all three OTP purposes — password reset, email verification, mobile verification — distinguished by a `purpose` column; see "OTPs are generalized" below), `Grade`/`Department` (organization-scoped lookup entities, see below).

Email (OTP delivery) goes through `nodemailer` in `src/utils/mailer.ts`, configured via `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM` in `.env` (see `.env.example`; defaults point at Gmail's SMTP host/port, but `SMTP_USER`/`SMTP_PASSWORD` have no fallback and must be set locally — Gmail requires a 16-char App Password, not the account password). `sendOtpEmail`'s third argument picks the subject line per purpose (`"password_reset"` | `"email_verification"`). Mobile OTP delivery (`src/utils/sms.ts`) is a `console.log` dev stub — no SMS provider is configured, same situation `mailer.ts` was in before Gmail SMTP was wired up; swap it for a real provider (Twilio/MSG91/etc.) before production. No queue/retry — send failures currently throw straight out of the controller.

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

### `src/utils/`
Flat files (`jwt.ts`, `otp.ts`, `password.ts`, `mailer.ts`, `sms.ts`, `validation.ts`, `auth.ts`) plus one subfolder, `src/utils/constants/`, for pure constant values — currently `regex.constant.ts` (email/phone/OTP/password/GST/name patterns), imported by `validation.ts`'s helper functions rather than inlined there. This mirrors the frontend's `src/utils/constants/` + `src/utils/helpers/` split (see `frontend/CLAUDE.md`) at the scale this backend actually needs — a `helpers/` subfolder isn't split out yet since `validation.ts` is still the only helper module; move it into `src/utils/helpers/validation.helper.ts` if/when a second one shows up. `auth.ts` holds `accessTokenCookieOptions()` and `toPublicUser()` — shared between `auth.controller.ts` and `registration.controller.ts` so both issue identical session cookies and the identical public user shape.

### OTPs are generalized, not per-feature
There's one `Otp` model/table for every OTP purpose (`purpose: "password_reset" | "email_verification" | "mobile_verification"`, plus an `identifier` column holding whichever email/phone the OTP was sent to) rather than a dedicated table per feature. When adding a new OTP-gated flow, add a new `purpose` value and filter by it — don't create another table.

### Registration token vs. reset token vs. access token
Three distinct JWT types exist in `src/utils/jwt.ts`, each with a `type` discriminant checked on verify: `access` (the real session, in the httpOnly cookie), `password_reset` (short-lived, issued after forgot-password OTP verification), `registration` (short-lived, issued after registration email-OTP verification — required by every `/api/auth/registrations/*` endpoint from that point on). `registrationToken` is single-use: `completeRegistration` sets `User.registrationCompletedAt`, and every registration endpoint's guard (`requireRegistrationUser` in `registration.controller.ts`) rejects the token once that's set, even though the JWT itself would otherwise still be valid until its ~15-minute expiry.

### `refreshToken` is issued but not yet redeemable
`POST /api/auth/registrations/complete` returns a `refreshToken` in its response body (per `user-stories/002-organization-signup.md`'s documented contract), but there's no `/api/auth/refresh` endpoint to redeem it yet, and no rotation/revocation policy — building that is separate, not-yet-requested infrastructure. Don't assume a refresh flow exists elsewhere just because a token is being handed out here.

### Active organization / switching organizations
`User.activeOrganizationId` is which of a user's organizations is "current" (see `user-stories/003-header-navigation.md`). `getCurrentOrganization(user)` in `src/utils/auth.ts` takes the already-loaded `User` instance (not a bare `userId`, to avoid a redundant fetch in callers that already have it) and reads this column directly, falling back to the first `OrganizationMember` row only if it's unexpectedly null (e.g. a pre-003 row that predates the column, though the migration backfills all of those too). `GET /api/organizations/mine` (`organization.controller.ts`) lists every organization a user belongs to with an `isActive` flag; `PATCH /api/users/me/active-organization` (`user.controller.ts` / `user.routes.ts`, mounted at `/users`) is the only place that column is written after initial registration — it 403s if the requested `organizationId` isn't one of the caller's own `OrganizationMember` rows. `registration.controller.ts`'s `createRegistration` also sets it directly at signup, so a brand-new user never relies on the fallback.

### Org-scoped CRUD resources (Grade, Department, and their siblings to come)
`Grade` (`grade.model.ts`/`grade.controller.ts`/`grade.routes.ts`, mounted at `/grades`) and `Department` (`department.model.ts`/`department.controller.ts`/`department.routes.ts`, mounted at `/departments`) are the first two of what `user-stories/006`/`008`–`010` describe as several near-identical org-scoped CRUD resources — expect `Role`/`Employee` to follow the exact same shape (copy `department.controller.ts`, not `grade.controller.ts`, since it's the more recently added of the two twins and easiest to diff against). The shared pattern: every handler starts by resolving the caller's organization via `getActiveOrganizationId(req.userId)` in `utils/auth.ts` (a small helper added specifically so each new resource's controller doesn't re-fetch `User` and re-read `activeOrganizationId` itself) and 401s if that's null; every row lookup filters by `{ id, organizationId }` together so a request for another organization's row 404s instead of leaking a 403 (see `user-stories/004-grade-management.md`'s Edge Cases for why). Name-uniqueness is checked case-insensitively via `Op.iLike` in application code (a plain unique index would be case-sensitive), matching the same pattern GST/email uniqueness already uses elsewhere. `membersCount` (and the Members-column sort) is computed by aggregating `OrganizationMember` rather than stored on `Grade`/`Department` themselves, and — since that aggregate can't be ordered inside the same paginated query as the base table — sorting/pagination by `membersCount` happens in memory after fetching the full (organization-scoped, search-filtered) result set; this is a deliberate trade-off documented in `004`'s Open Questions, correct at today's expected scale (an organization's grade/department list) but revisit if that assumption stops holding. `Grade` and `Department` are deliberately separate tables/columns rather than one generalized "lookup" table with a type discriminant — see `005`'s Open Questions for why.

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply (TypeScript strictness, security). See root `CLAUDE.md` for repo-wide context.
