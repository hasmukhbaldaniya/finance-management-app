# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Node.js + Express 5 + TypeScript service (`strict: true`, `moduleResolution: nodenext`), ORM
Sequelize over its own PostgreSQL database (`pg`/`pg-hstore`). **Extracted from `backend/` per
`docs/PLANS/microservices-plan.md`'s Phase 3** — this is the identity/org backbone of the whole
system: login/forgot-password (`user-stories/001-authentication.md`), company registration
(`user-stories/002-organization-signup.md`), Grade/Department/Role/Associated-Organizations
management (`004`-`007`), the full Employee Management epic — Invitation wizard, Listing,
Bulk Invite, Onboarding (`008`-`011`) — and Employee Profile self-service (`012`). Everything this
doc describes used to live in `backend/` (see that project's own `CLAUDE.md` for what's left there
— Category/Trip/Claim/Split-Claim). Controllers still talk to models directly, no service/repository
layer, same posture the code had before the move — `src/services/communications.service.ts` is the
one exception, a thin HTTP client for the standalone `communications-service` (email/WhatsApp),
mirroring `backend`'s own `ai-extraction.service.ts` shape.

Models: `Employee` (the login/session entity — see "The User → Employee merge" below for how it
absorbed `User`; also the entity Employee Invitation, `008`, is built around), `EmployeeCompanyAccess`
(per-employee Role/Department/Grade assignment — also the successor to the removed
`OrganizationMember`), `Organization`, `Otp` (a single generalized table for all three OTP purposes
— password reset, email verification, mobile verification — distinguished by a `purpose` column;
see "OTPs are generalized" below), `Grade`/`Department`/`Role` (organization-scoped lookup entities,
see below — `Role` additionally carries `isDefault` and a `privileges` string array, see "Roles &
Privileges" below), `AssociatedOrganization` (an org-to-org network row, not org-scoped-lookup like
the others — see "Associated Organizations" below), `Project`/`EmployeeProject`/`Airline`/
`EmployeeFfNumber`/`ApprovalLevel`/`EmployeeInvite` (the remaining tables backing Employee Invitation
— see "Employee Invitation" below), `BulkUpload`/`BulkUploadError` (audit trail for `010`'s upload
validation attempts — see "Bulk Invite Employees" below). Employee Onboarding (`011`) adds no new
tables — it writes to the same `Employee` columns the User → Employee merge already added, and
reuses `Otp` under a new `purpose` value.

**Email and mobile-notification delivery goes through the standalone `communications-service`
microservice** (Phase 1 of the same plan) — `src/utils/mailer.ts`/`employee-invite-mailer.ts` build
the same subject/body text they always did and call `src/services/communications.service.ts`
(POSTs to that service's `/api/notifications/email`); `src/utils/sms.ts` calls its
`/api/notifications/whatsapp` channel instead of its old `console.log` stub (no real WhatsApp
provider is chosen yet — see `communications-service/CLAUDE.md` — so behavior is unchanged, only
the wiring is in place). This service no longer depends on `nodemailer` at all; `SMTP_*` config lives
only in `communications-service/.env`.

## Common Commands

```
npm run dev                   # ts-node-dev, auto-restart on change
npm run build && npm start    # compile to dist/ and run
npm run migrate               # sequelize-cli db:migrate
npm run migrate:undo          # sequelize-cli db:migrate:undo
npm run seed                  # sequelize-cli db:seed:all
```
There is no lint script and no test runner configured yet (`npm test` is a stub that exits 1).
Env vars are loaded via `dotenv` — see `.env.example`; never commit `.env`. Requires this service's
own Postgres running (see root `CLAUDE.md` / `docker-compose.yml`'s `postgres-auth` service, port
`5433` — a separate container from `backend`'s own `postgres`, not just a second logical database).

## Architecture

Structure: `src/{config,models,controllers,routes,middleware,migrations,seeders,services}`.

### Cross-service architecture (new in Phase 3 — read this before touching auth/org data)

- **`organizationId` is embedded directly in the access-token JWT** (`utils/jwt.ts`'s
  `AccessTokenPayload`), set at issue time from `Employee.organizationId` — safe because that column
  is immutable once set (see "The User → Employee merge" below). `middleware/require-auth.ts` reads
  it straight off the verified claim (`req.organizationId`) with **no DB lookup** — this replaced a
  `getActiveOrganizationId(userId)` helper (an `Employee.findByPk` on nearly every request) that used
  to exist in `utils/auth.ts`; that function is now deleted, not just deprecated. Every controller in
  this service (`grade`/`department`/`role`/`project`/`employee`) was updated to read
  `req.organizationId` directly instead of awaiting that helper.
- **`POST /api/internal/employees/lookup` and `GET /api/internal/airlines`** (`internal.routes.ts`,
  gated by the same optional `X-Internal-Api-Key` shared-secret pattern `ai-service`/
  `communications-service` already use) are the only routes `backend` (soon to be `claim-service`)
  still calls here — real employee names/emails for category "created by"/split-request colleagues/
  duplicate-bill-detection's claimant, and the `Airline` catalog for expense-field validation.
  Everything else those call sites used to read locally now comes from the caller's own JWT claim
  instead. See `backend/CLAUDE.md`'s equivalent section and `docs/PLANS/microservices-plan.md`'s
  Phase 3 for the full audit of what moved and why.
- **Real data migration, not a greenfield service**: this service's Postgres database was seeded via
  `pg_dump`/restore of `backend`'s original `finance_management` database's 16 auth-owned tables
  (schema via replaying the same 19 historical migration files verbatim, data via `--data-only`
  dump/restore), not built up from scratch. Row counts were verified to match exactly across every
  table as part of that migration.

### The User → Employee merge — `Employee` is the login entity, `User`/`OrganizationMember` no longer exist
This codebase used to have a separate `User` (login/session/OTP-verification/multi-org-membership) and `Employee` (008's richer per-org person record — DOB, gender, approval chains, company access). At explicit request, they were merged: `Employee` absorbed everything `User` did, and `User`/`OrganizationMember` were dropped entirely via a migration sequence (`20260707140000` through `20260707170000`) that added auth fields to `employees`, relaxed several columns to nullable, data-migrated every `users` row into a matching/new `employees` row (repointing `createdBy`/`updatedBy`/`sentBy` FKs from old user ids to the new employee ids along the way), then dropped `organization_members` and `users` and replaced `employees`' org-scoped email/contact-number unique indexes with global ones (an `Employee` is now a login identity, and login has no organization context to scope uniqueness by).

**What this means concretely:**
- `Employee` gained `passwordHash`, `emailVerifiedAt`, `mobileVerifiedAt` (all nullable — a still-pending invitee has none of these yet), and `isOwner` (boolean, replacing `OrganizationMember.role === "owner"`).
- `title`/`gender`/`countryCode`/`contactNumber`/`createdBy`/`updatedBy` became nullable, since self-registration (`registration.controller.ts`) collects far less than the admin-invite wizard does (008) — no title/gender/contact number upfront, and no inviting admin to record. The invite wizard's own application-level validation still requires those fields for admin-created rows; only the DB constraint relaxed.
- `Employee.userId` was removed outright — there's no separate row to link to anymore, the Employee row *is* the account.
- `invitationStatus` (`"pending"|"registered"`) now doubles as what `User.registrationCompletedAt` used to gate — `requireRegistrationUser`'s single-use-token guard checks `invitationStatus === "registered"` instead of a timestamp column, rather than keeping two fields that mean the same thing.
- `EmployeeCompanyAccess.departmentId`/`gradeId` became nullable (`roleId` stays required) so a freshly self-registered org creator can get a `Company Admin` `EmployeeCompanyAccess` row immediately (needed for the approver picker, see below) without a Department/Grade existing yet.
- **Multi-organization membership is gone.** `OrganizationMember` (the many-to-many join table, `User`↔`Organization`) is dropped along with `User` — `Employee.organizationId` is fixed at creation, so there's no more "active organization" to switch (this is also exactly why embedding it in the JWT, above, is safe). This deleted `PATCH /api/users/me/active-organization`, `GET /api/organizations/mine`, `user.controller.ts`/`user.routes.ts` entirely, and the frontend's switch-organization screen (`003`'s feature). `007`'s **different** "Associated Organizations (Network)" feature — an org-to-org listing, not personal multi-membership — is unaffected.
- `grade.controller.ts`/`department.controller.ts`/`role.controller.ts`'s `list*Members` endpoints and `membersCount` aggregates moved from querying `OrganizationMember`+`User` to `EmployeeCompanyAccess`+`Employee` — same shape, different source table.
- `utils/auth.ts`'s helpers were rewritten against `Employee`: `toPublicUser` → `toPublicEmployee` (still returns `{id, name, email, phone}` — `name` is derived as `` `${firstName} ${lastName}`.trim() ``, `phone` as `contactNumber`, so the frontend's response contract is unchanged), `getCurrentOrganization` now just does `Organization.findByPk(employee.organizationId)` (no more membership-fallback lookup), `isOrganizationOwner` now checks `employee.isOwner` directly.
- `middleware/require-owner.ts` simplified to `Employee.findByPk(req.userId)` + check `.isOwner` — no more separate `OrganizationMember` lookup.
- `employee.controller.ts`'s `ensureSelfEmployee` — a function that used to fabricate a placeholder `Employee` row (fake `title:"Mr"`, `gender:"Other"`, synthetic contact number) for a logged-in admin who had no real `Employee` row — was deleted outright. Every logged-in principal is a real `Employee` row now, so there's nothing left to fabricate; `listEmployeesForPicker` just always includes `req.userId` in its result set.
- **Real pre-existing data note**: the data migration found one genuine conflict during this merge — an `Employee` row in one organization with `invitationStatus: "pending"` (a never-accepted invite) shared an email with a different, real `User` account being migrated in from another organization. Since `Employee.email` is now globally unique, that stale, never-accepted invite was deleted as part of the migration (it had no password, no completed onboarding — it couldn't coexist with the real account under the new uniqueness rule). Any similarly-stale pending invites sharing an email with a real account would hit the same resolution if this migration sequence were ever re-run against different data.

### Request flow
`src/server.ts` calls `sequelize.authenticate()` then `createApp()` from `src/app.ts`, which wires middleware (helmet, cors, morgan, json body parsing, cookie-parser) and mounts `apiRouter` under `/api`. Routing fans out through `src/routes/index.ts` → per-resource router (e.g. `health.routes.ts`) → controller function in `src/controllers/`. Controllers are plain functions `(req, res) => void` — no service/repository layer beyond `src/services/communications.service.ts`. Errors fall through to `notFoundHandler`/`errorHandler` in `src/middleware/error-handler.ts` (registered last in `app.ts`), which return JSON `{ error }` shapes.

### Two separate config sources — keep them in sync manually
DB connection settings are defined **twice** and must be kept consistent by hand:
- `src/config/env.ts` — reads `process.env` via `dotenv`, used by the app at runtime (`server.ts`, `config/database.ts`).
- `src/config/config.js` — plain JS read directly by `sequelize-cli` (per `.sequelizerc`), since the CLI doesn't run through ts-node.

If you add a new env var the app needs, decide whether `config.js` also needs it (only required for values Sequelize CLI itself uses, i.e. DB connection params).

### Models and migrations
Migrations/seeders are plain `.js` (CLI-only, see `.sequelizerc`); models and all other app code are `.ts`. Columns are camelCase end-to-end (`createdAt`/`updatedAt`, not snake_case) — migrations and `Model.init()` column defs must match exactly, and there's no `underscored: true` anywhere. New models: add a migration in `src/migrations/`, define the class in `src/models/`, then re-export it from `src/models/index.ts` (see `employee.model.ts` for the `InferAttributes`/`InferCreationAttributes`/`CreationOptional` pattern). All 19 migration files here are the exact ones originally authored in `backend/` — copied verbatim, not rewritten, so replaying them against an empty database reproduces the live schema exactly (verified during the Phase 3 migration).

### `src/utils/`
Flat files (`jwt.ts`, `otp.ts`, `password.ts`, `mailer.ts`, `sms.ts`, `validation.ts`, `auth.ts`, `employee-bulk-file.ts`) plus one subfolder, `src/utils/constants/`, for pure constant values — `regex.constant.ts` (email/phone/OTP/password/GST/name patterns), `role.constant.ts`, `employee.constant.ts`, `bulk-invite.constant.ts`. `auth.ts` holds `accessTokenCookieOptions()`/`refreshTokenCookieOptions()` and `toPublicEmployee()` — shared between `auth.controller.ts` and `registration.controller.ts` so both issue identical session cookies and the identical public user shape. `getActiveOrganizationId` used to live here too — deleted, see "Cross-service architecture" above.

### OTPs are generalized, not per-feature
There's one `Otp` model/table for every OTP purpose (`purpose: "password_reset" | "email_verification" | "mobile_verification"`, plus an `identifier` column holding whichever email/phone the OTP was sent to) rather than a dedicated table per feature. When adding a new OTP-gated flow, add a new `purpose` value and filter by it — don't create another table. `Otp` has never had any FK/association to the login entity (identifier is matched by plain string value) — it needed zero schema changes for the User → Employee merge above, only the surrounding controller code's `User.findOne`/`findByPk` calls became `Employee` ones.

### Registration token vs. reset token vs. access token vs. refresh token
Four distinct JWT types exist in `src/utils/jwt.ts`, each with a `type` discriminant checked on verify: `access` (the real session, in the httpOnly cookie — carries `organizationId` too, see "Cross-service architecture" above), `password_reset` (short-lived, issued after forgot-password OTP verification), `registration` (short-lived, issued after registration email-OTP verification — required by every `/api/auth/registrations/*` endpoint from that point on), `refresh` (long-lived, in its own httpOnly cookie scoped to `/api/auth`, redeemable via `POST /api/auth/refresh`). `registrationToken` is single-use: `completeRegistration` sets `Employee.invitationStatus = "registered"`, and every registration endpoint's guard (`requireRegistrationUser` in `registration.controller.ts`) rejects the token once that's set, even though the JWT itself would otherwise still be valid until its ~15-minute expiry.

### `refreshToken` — issued on login too, redeemable via `POST /api/auth/refresh`
`login`, `completeRegistration`, and `completeOnboarding` all set a **second** httpOnly cookie (`REFRESH_COOKIE_NAME`, default `refresh_token`) alongside the access-token cookie — `refreshTokenCookieOptions()` in `utils/auth.ts` scopes it to `path: "/api/auth"` specifically, since it only ever needs to reach `/refresh` (to redeem it) and `/logout` (to clear it), not every request the way the access-token cookie does. `completeRegistration`/`completeOnboarding` still also return `refreshToken` in their JSON response body (the documented `002` contract, even though the frontend currently discards it — see `frontend/CLAUDE.md`) — that's redundant with the cookie, kept for contract-compatibility.

`POST /api/auth/refresh` (no `requireAuth` — the whole point is redeeming a refresh cookie once the access token has already expired) verifies the refresh cookie via `verifyRefreshToken` and, unlike per-request access-token verification, **does hit the DB**: it re-checks `Employee.status === "active"` and `invitationStatus === "registered"` before issuing a fresh access token (with the caller's current `organizationId` re-read from the row, not copied from the old token). This shrinks a suspended employee's "still has access" window down to one access-token TTL instead of the full 30-day refresh-token lifetime, verified directly (suspend the employee mid-session, the very next refresh call 401s). **Still no rotation or revocation list, by deliberate choice** — `logout` clears both cookies browser-side but doesn't invalidate the refresh JWT itself server-side; building real rotation/revocation would need a token store, genuinely new infrastructure, not introduced here.

### Org-scoped CRUD resources (Grade, Department, Role, and the siblings still to come)
`Grade` (`grade.*`, mounted at `/grades`), `Department` (`department.*`, mounted at `/departments`), and `Role` (`role.*`, mounted at `/roles`) are the first three of what `user-stories/008`–`010` describe as several near-identical org-scoped CRUD resources. `Employee` ended up needing its own shape rather than a straight copy of these three, since it's a genuinely different kind of entity — see "Employee Invitation" below. The shared pattern for these three: every handler reads `req.organizationId` (set by `requireAuth` directly off the JWT claim — see "Cross-service architecture" above, no longer a DB helper call) and 401s if that's undefined; every row lookup filters by `{ id, organizationId }` together so a request for another organization's row 404s instead of leaking a 403 (see `user-stories/004-grade-management.md`'s Edge Cases for why). Name-uniqueness is checked case-insensitively via `Op.iLike` in application code (a plain unique index would be case-sensitive), matching the same pattern GST/email uniqueness already uses elsewhere. `membersCount` (and the Members-column sort) is computed by aggregating `EmployeeCompanyAccess` rather than stored on `Grade`/`Department`/`Role` themselves, and — since that aggregate (and, for `Role`, the `roleType` sort derived from `isDefault`) can't be ordered inside the same paginated query as the base table — sorting/pagination happens in memory after fetching the full (organization-scoped, search-filtered) result set; this is a deliberate trade-off documented in `004`'s Open Questions, correct at today's expected scale (an organization's grade/department/role list) but revisit if that assumption stops holding. `Grade`/`Department`/`Role` are deliberately separate tables/columns rather than one generalized "lookup" table with a type discriminant — see `005`'s Open Questions for why.

### Roles & Privileges — default roles and the privilege catalog
`Role` is the first org-scoped resource with rows an org didn't create and can't fully control: every organization gets a seeded `Company Admin` (all privileges) and `Members` (a fixed subset) row, both `isDefault: true` — see `utils/constants/role.constant.ts` for the privilege key list (kept byte-identical to the frontend's copy in `src/utils/constants/privilege.constant.ts`) and `20260702110000-create-roles.js` for the seeding/backfill migration. `role.controller.ts`'s `updateRole`/`updateRoleStatus`/`deleteRole` all 403 immediately if `role.isDefault` — enforced server-side regardless of what the frontend's disabled UI already prevents (see `006`'s Edge Cases). New registrations get their two default roles from `registration.controller.ts`'s `createRegistration` (mirroring how it already creates the `Organization`), not from the migration — the migration only backfills organizations that predate this feature. `listRoles` also pins Company Admin/Members ahead of every custom role regardless of `sortBy`/`sortDir` — computed by sorting the default and custom groups separately, then concatenating defaults-first *before* the pagination slice, so they always land on page 1 and never reappear later.

### Associated Organizations — the first role-gated screen, and a different kind of "organization-scoped" resource
`AssociatedOrganization` is **not** an org-scoped lookup like `Grade`/`Department`/`Role` — it's an org-to-org network row (`ownerOrganizationId` is the org that owns the view; `organizationId` is nullable and only populated once an invited contact actually registers). `requireOwner` (`middleware/require-owner.ts`) is the first permission check in this codebase beyond plain authentication: it checks the caller's `Employee.isOwner` flag (shared with `GET /me`'s `isOwner` flag so the frontend can hide the nav link without a separate request) and 403s otherwise, attaching `req.organizationId` so `associated-organization.controller.ts` doesn't re-resolve it. **`Registrations` ("Self-Registered"/"Invited"/"Registered") is computed, not stored** — derived from `registrationType` + whether `organizationId` is set — same "derive, don't duplicate" reasoning as `Role`'s `roleType`/`membersCount`. There's no create/invite endpoint in this story (see `007`'s Out of Scope) — the table starts empty for every organization and stays that way until a future story adds the invite flow; `listAssociatedOrganizations` fetches the full organization-scoped set and filters/sorts/paginates in memory, the same trade-off as the other CRUD resources' derived columns.

### Employee Invitation — the module→approval fan-out (and its later removal)
`Employee` (`employee.controller.ts`, mounted at `/employees`) is deliberately **not** a copy of the `Grade`/`Department`/`Role` CRUD shape above — it's a genuinely richer entity (see "The User → Employee merge" above for what it now also covers). The wizard's 4 steps map to 4 handlers, each idempotent-on-resubmit via replace-not-append writes: `createEmployee` (Step 1, org-scoped uniqueness on employeeCode plus **global** uniqueness on email/contact — see the merge note above), `updateEmployeeCompanyAccess` (Step 2, `findOrCreate`-then-update on `EmployeeCompanyAccess` since it's 1:1 per employee, plus a destroy-then-recreate replace of `EmployeeProject` rows), `addEmployeeFfNumbers` (Step 3, same destroy-then-recreate replace on `EmployeeFfNumber`), and `saveEmployeeApprovals` (Step 4a, same replace pattern on `ApprovalLevel`). `sendEmployeeInvite` (Step 4b) is the terminal action: 409s if `invitationStatus !== "pending"` (already registered), 429s past a daily cap of 5 sends (counted via `EmployeeInvite.count` within a day-boundary window), then calls `sendEmployeeInviteEmail` (`utils/employee-invite-mailer.ts`, now via `communications-service`) and logs an `EmployeeInvite` row.

**`GET /api/employees/approvers` (`listEmployeesForPicker`) is the approver picker, moved off the main path once `009` needed it**: minimal, unpaginated, privilege-scoped — it returns only active employees whose Role carries the `claim_trip_approvals` privilege (`APPROVER_PRIVILEGE_KEY` in `utils/constants/employee.constant.ts`) via a `Role.privileges @> ['claim_trip_approvals']` (`Op.contains`) query joined through `EmployeeCompanyAccess.roleId`. The logged-in caller is always included regardless of that filter. `GET /api/employees` (no trailing path) is `009`'s full listing instead — see below.

`Project` (`project.controller.ts`, mounted at `/projects`) and `Airline` (`airline.controller.ts`, mounted at `/airlines`) are minor supporting resources — `GET /api/projects?departmentId=` and `GET /api/airlines` exist purely to populate Step 2's Projects picker and Step 3's Airline picker. `Airline` is a fixed, seeded, global (non-org-scoped) catalog — no management UI. **`claim-service`'s `expense-fields.ts` also validates airline-picker field values against this same catalog**, via `GET /api/internal/airlines` (see "Cross-service architecture" above) — cached indefinitely on the caller's side, since this table can only ever change through a migration, never at runtime.

### Employee Listing (009) — the main `GET /api/employees`, self-exclusion, and the last-Company-Admin rule
`listEmployees` (`employee.controller.ts`) is the searchable/filterable/sortable/paginated screen `009` specs, mounted at plain `GET /employees`. **It always excludes the caller's own record** (`id: { [Op.ne]: req.userId }`). Role/Department/**Grade** names all come from a join through `EmployeeCompanyAccess`, so sorting and pagination happen in memory after fetching the full filtered set. Filtering is per-column (`name`/`email`/`contactNumber`) — `name` OR-matches `firstName`/`lastName`/`employeeCode`, `email`/`contactNumber` each match only their own column, all case-insensitive substring (`Op.iLike`).

`PATCH /api/employees/:id/status` (`updateEmployeeStatus`) enforces `009`'s two Suspend business rules server-side: self-suspend is rejected outright, and suspending an employee is rejected if they hold the organization's `Company Admin` `EmployeeCompanyAccess.roleId` and no *other* employee with that same role is currently `active`/`registered`.

`GET /api/employees/:id` (`getEmployeeDetail`) and `PATCH /api/employees/:id` (`updateEmployeeBasicInfo`) power the Listing's **Edit** action.

### Bulk Invite Employees (010) — CSV/XLSX upload, validate-then-confirm, and why parsed rows live in memory, not a table
`employee-bulk-invite.controller.ts` (mounted at `/api/employees/bulk`, gated by `requireOwner` on top of `requireAuth`) implements `010`'s upload → validate → confirm flow: `GET /template` downloads a generated `.xlsx` sample, `POST /upload` (multipart, `multer`, 10 MB/`.csv`+`.xlsx`-only) parses the file, validates every row independently, and returns a summary; `POST /import` persists whichever rows validated; `GET /:uploadId/errors` downloads the per-row failures as a generated `.xlsx`.

**Parsed-but-unconfirmed rows are held in an in-process `Map<uploadId, {organizationId, rows, expiresAt}>`, not a table** — a real, accepted limitation at single-instance scale: it doesn't survive a restart, and wouldn't work across more than one instance. `BulkUpload`/`BulkUploadError` are audit rows, independent of whether the parsed rows are still in memory. Row validation (`validateRows`) is a 3-pass function for efficiency reasons — see `backend/CLAUDE.md`'s original write-up (unchanged content, kept there since this doc is already long) or `010`'s own doc for the full matching-priority logic.

### Employee Onboarding (011) — the invited employee's own accept-invite flow, and why it's a sibling router, not a nested one
`011` picks up where `008`'s invite email left off: `sendEmployeeInvite` mints a short-lived `onboarding` JWT and builds a real `http://localhost:3000/onboarding?token=...` link, sent via `communications-service`. `employee-onboarding.controller.ts` (mounted at `/api/employee-onboarding`, not nested under `/employees`, since none of these requests carry a session yet) implements the 4-step flow: verify-token, password, profile, mobile + mobile-otp, and complete. **One flat 10-minute token covers the entire flow** — every endpoint re-verifies it independently and rejects it once `invitationStatus === "registered"`. `completeOnboarding` flips `invitationStatus` to `"registered"`, issues a real access/refresh token pair (now including `organizationId` in the access token), sets the session cookie, and returns `{user, organization, accessToken, refreshToken}`.

### Employee Profile (012) — self-service, not admin management, and why the mobile-change flow doesn't touch the schema
`employee-profile.controller.ts` (`GET`/`PATCH /api/employees/me`, `PUT /api/employees/me/mobile`, `POST /api/employees/me/mobile-otp`, `POST /api/employees/me/mobile-otp/verify`, all mounted on `employeeRouter` before the `/:id` routes) is deliberately a separate epic from Employee Management: those stories are an admin managing *other* employees; this is every employee managing their own account. `PATCH /api/auth/me/password` (`changePassword` in `auth.controller.ts`) is the third piece.

**`PATCH /api/employees/me`'s body is deliberately narrow** — `title`/`firstName`/`lastName`/`dob`/`gender`/`employeeCode` only; `email`/`organizationId`/`roleId`/`departmentId`/`gradeId` aren't read at all. **Changing your own Contact Number doesn't touch `Employee.countryCode`/`contactNumber` until the OTP verifies** — the pending pair is encoded directly into `Otp.identifier` as `` `${employeeId}:${countryCode}:${contactNumber}` `` rather than adding new nullable columns to `Employee`.

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply (TypeScript strictness, security). See root `CLAUDE.md`
for repo-wide context, and `backend/CLAUDE.md` for what's left there (Category/Trip/Claim/
Split-Claim) and how it calls back into this service.
