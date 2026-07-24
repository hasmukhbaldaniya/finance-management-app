# Microservices Extraction Plan

Status: All 5 phases are built — `communications-service`, `POST /api/auth/refresh`,
`auth-service`, and `claim-service` (own `CLAUDE.md` each; the original `backend/` directory no
longer exists — it was renamed in place once every other domain had moved out of it). The API
gateway is also built (`gateway-service/`, own `CLAUDE.md`) — the frontend calls it as one
shared base URL (`http://localhost:4400/api`), which forwards to `auth-service` (`:4300`),
`claim-service` (`:4000`), or `reports-service` (`:4500`) by path prefix; the browser never talks to
any of those three origins directly. Phase 5 (`reports-service`, own `CLAUDE.md`) is done too —
three read-only org-wide reports (`user-stories/028-reports.md`), still with no database of its own,
gated by `isOwner` embedded in the access-token JWT the same way `organizationId` already was. See
`docs/PLANS/microservices-frontend-integration-plan.md` for the gateway's routing table and
completion notes.

## Why

`backend/` is currently a single Node/Express/TypeScript monolith over one Postgres DB, covering
auth, org/employee management, category configuration, trip management, and claim/expense
management (with `ai-service` already split out as a separate Python microservice — see
`ai-service/CLAUDE.md`). The goal is to split `backend/` further into independently deployable,
independently scalable services, with each service owning its own database (true microservices,
not just separate processes sharing one DB).

Drivers: independent scaling, independent deploys, team ownership boundaries, and establishing the
pattern for future services.

## Target services

| Service | Database | Owns (tables/collections move here) | Talks to |
|---|---|---|---|
| **auth-service** | PostgreSQL | `Employee`, `EmployeeCompanyAccess`, `Organization`, `Otp`, `Grade`, `Department`, `Role`, `AssociatedOrganization`, `Project`, `EmployeeProject`, `Airline`, `EmployeeFfNumber`, `ApprovalLevel`, `EmployeeInvite`, `BulkUpload`, `BulkUploadError` | communications-service (OTP/invite emails) |
| **claim-service** | PostgreSQL | `Category` + its 9 related tables, `Claim`, `Expense`, `ClaimInvoiceFile`, `ExpenseSplitRequest`, `ExpenseSplitRequestMember`, `Trip`, `Country`, `City` | ai-service (already HTTP; now also reads `AiExtractionLog` status via ai-service's own API), communications-service (split-request emails), auth-service (approver/employee lookups for approval flows) |
| **ai-service** | **MySQL** (new) | `AiExtractionLog` — moves here from claim-service, see below | Anthropic API (already); called by claim-service over HTTP (contract unchanged) |
| **communications-service** | MongoDB | a `notifications`/delivery-log collection — heterogeneous per-provider payloads (email vs. WhatsApp) suit a flexible schema | none — leaf service, same shape as `ai-service` today |
| **reports-service** | none | nothing initially | auth-service, claim-service (read-only, on demand) |

**`ai-service` is gaining a database — a deliberate reversal of its original "no DB" design.**
`ai-service/CLAUDE.md` currently describes it as "deliberately stateless... no database connection,
no ORM models," with `backend`'s `claim-ai.controller.ts` "own[ing] writing every call to
`AiExtractionLog`" after the fact. Per `user-stories/023-claim-creation-ai-powered.md`'s own framing
of "The AI/ML Service" ("one well-defined place that talks to the AI/ML provider... every call —
request and response — is logged to a new table"), the audit trail was always conceptually this
service's own responsibility — it just couldn't own it while it had no database. Now that it's
getting one, `AiExtractionLog` moves out of claim-service's Postgres and into ai-service's own MySQL
database, and **ai-service starts writing its own audit rows** (`pending` → `completed`/`failed`)
around each extraction it performs, instead of claim-service writing them after receiving the HTTP
response. See "Database per service" below for the cross-service consequences this creates.

Grade/Department/Role/Project/Airline/AssociatedOrganization are folded into auth-service since
they're all read through `EmployeeCompanyAccess` joins today and are part of the identity/org
backbone, not the Claim/Category/Trip domain.

**Trip now lives inside claim-service, alongside Claim and Category.** This is a deliberate change
from an earlier version of this plan (which gave Trip its own MongoDB service) — the coupling
between Trip and Claim is real and tight, not incidental:

- `Trip.totalAmount` is not user-entered anywhere — it's a rollup. The actual chain is:
  `Expense.amount` (user-entered, one row per expense line) sums up into `Claim.totalAmount` (one
  claim's total), and `recomputeTripFromLinkedClaims` (`backend/src/utils/trip-total.ts`) sums
  *every* `Claim.totalAmount` linked to a trip via `tripId` into `Trip.totalAmount` (the whole
  trip's total across all its claims, draft and submitted alike). Three levels, one nested inside
  the other.
- Keeping Trip in claim-service means this stays a single in-process DB call, exactly as it works
  today (`claim.controller.ts` calls `recomputeTripFromLinkedClaims` after `saveExpenses`,
  `deleteClaim`, `splitClaim`) — no cross-service push, no risk of the two falling out of sync, and
  no need to reimplement `DECIMAL(12,2)` money handling in a second database engine (see "Database
  per service" below for why that reimplementation would have been a real risk).

Claim, Category, and Trip are kept together for the same underlying reason: a Claim's expense form
is driven directly by the selected Category's field configuration (`CategoryField`), the AI
extraction flow matches against Category data, and now Trip's own totals are derived from Claim
data too. Splitting any of these three apart would create cross-service calls on the hot path for
no benefit.

## Resolving the real coupling points

- **Auth on every request → stateless JWT verification.** Each service independently verifies the
  access-token JWT (shared verification secret/public key) to get `employeeId`/`organizationId` —
  no synchronous call to auth-service on the hot path. Trade-off: a suspend/deactivate/logout
  doesn't take effect until the token naturally expires. This makes closing the existing refresh
  gap a prerequisite (see Phase 2 below) so access tokens can be kept short-lived without forcing
  constant re-login.
- **Trip ↔ Claim.** No longer a cross-service concern — both live in claim-service, so
  `recomputeTripFromLinkedClaims` stays exactly what it is today: an in-process function call after
  a relevant Claim write, not a network call.
- **Reports.** Starts by calling auth-service's and claim-service's own read APIs on demand and
  aggregating in memory — no new message-broker infrastructure. Revisit only if/when fan-out
  latency or volume becomes a real problem.
- **Communications.** Lowest-risk extraction — same shape as `ai-service`: stateless, invoked over
  HTTP, no meaningful data ownership of its own.

## Extraction order (strangler-fig, not big-bang)

1. **communications-service first — done.** `mailer.ts`/`sms.ts`/`employee-invite-mailer.ts`/
   `split-request-mailer.ts` are now HTTP calls (`backend/src/services/communications.service.ts`)
   to the new service instead of local `nodemailer`/`console.log` calls; `nodemailer` is removed
   from `backend`'s own dependencies entirely. WhatsApp exists as a second channel alongside email,
   but is still a `console.log` stub (`communications-service/src/services/whatsapp.service.ts`) —
   no real provider was chosen (deliberately deferred), so `sms.ts`'s mobile-OTP delivery now calls
   that stub instead of its own; behavior is unchanged (nothing is actually delivered yet), only the
   wiring moved. `NotificationLog` (MongoDB) logs every attempt with a `"stubbed"` status distinct
   from `"sent"`/`"failed"`, so stub sends can never be misread as real delivery history. See
   `communications-service/CLAUDE.md` for the full architecture.
2. **Implement `POST /api/auth/refresh` — done.** `login`/`completeRegistration`/`completeOnboarding`
   now all set a second httpOnly cookie (`refresh_token`, scoped to `/api/auth` only — it never
   needs to leave that path) alongside the access-token cookie; `POST /api/auth/refresh` redeems it
   for a fresh access token. Unlike per-request access-token verification (deliberately stateless,
   no DB hit), refresh *does* hit the DB — a real, checked benefit: it re-validates
   `status === "active"` and `invitationStatus === "registered"`, so a suspended employee's
   "still has access" window shrinks from the full 30-day refresh-token lifetime down to one
   access-token TTL, not eliminated but meaningfully bounded. Deliberately no rotation/revocation-list
   (would need a real token store, genuinely new infrastructure, not introduced here) — logging out
   only clears the browser's cookies, it doesn't invalidate the JWT itself server-side, verified
   directly: a refresh call using a cookie captured before logout still succeeds after it. This was
   done while everything is still one DB/one transaction, deliberately cheaper than doing it
   mid-split.
3. **auth-service — done.** All 16 identity/org tables, their 19 original migration files, and every
   auth-domain controller/route/middleware/util moved into a new standalone service with its own
   Postgres database (`postgres-auth`, port `5433`, a separate container). The 19 migrations were
   copied verbatim and replayed against the fresh database — reproducing the live schema exactly,
   not a hand-authored approximation — then real data was migrated via `pg_dump --data-only`/restore;
   every one of the 16 tables' row counts were verified to match the source exactly before cutover.

   **The one architectural upgrade beyond "move the code": `organizationId` is now embedded directly
   in the access-token JWT**, set by auth-service at issue time from `Employee.organizationId` — safe
   since that column is immutable once set. This eliminated the single biggest cross-service call
   site the audit identified: nearly every claim/category/trip/grade/department/role/employee handler
   used to call `getActiveOrganizationId(userId)` (an `Employee.findByPk` DB hit) on almost every
   request; that function is now deleted entirely (in both services), replaced by a zero-cost
   `req.organizationId` read off the already-verified JWT claim.

   **The remaining cross-service surface is exactly three call sites**, all genuine reads of real
   employee data (not just `organizationId`, which the JWT now carries): `category.controller.ts`'s
   version "created by" names, `split-request.controller.ts`'s colleague validation/requester/member
   names, and `duplicate-expense-check.ts`'s claimant name — plus one unrelated read,
   `expense-fields.ts`'s airline-picker validation against the `Airline` catalog. Both go through new
   `auth-service` endpoints (`POST /api/internal/employees/lookup`, `GET /api/internal/airlines`),
   called via `backend/src/services/auth.service.ts` (same thin-HTTP-client shape as
   `ai-extraction.service.ts`/`communications.service.ts`). The airline list is cached indefinitely
   per-process in `backend` since it's static seed data with no management UI — avoiding a network
   call on every single claim save, a real hot path.

   **Verified live end-to-end, not just compiled**: logged in against auth-service's real migrated
   data, then used that same session cookie against `backend`'s claim/category/trip endpoints to
   confirm cross-service JWT verification actually works (not just in theory) — including a real
   split-request read that resolved an actual employee's name through the live
   `backend → auth-service → Postgres → back` round trip. See `auth-service/CLAUDE.md` and
   `backend/CLAUDE.md`'s "Cross-service reads" section for the full write-up.
4. **claim-service — done.** The original `backend/` directory was renamed to `claim-service/` in
   place (nothing else was left in it after Phase 3) and pointed at a brand-new Postgres database
   (`postgres-claim`, port `5434`) instead of the monolith's shared one. The 9 remaining
   claim-domain migration files (Category/Trip/Claim/split-request — the 19 auth-domain migrations
   that used to sit alongside them were deleted, since `auth-service` already has the authoritative
   copy) were replayed fresh, then real data was migrated via `pg_dump --data-only`/restore across
   all 18 tables — every row count verified to match the source exactly, same rigor as Phase 3.
   Real uploaded invoice files under `uploads/claims/` moved automatically with the directory rename.

   **The one real schema surgery, not anticipated at this level of detail until it was actually
   attempted: several of those 9 migrations had literal `references: { model: "organizations" |
   "employees" }` FK constraints** (Category.organizationId/createdBy, Trip.organizationId/
   employeeId, Claim.organizationId/employeeId, Expense.organizationId, ExpenseSplitRequest*'s
   employee columns, CategoryApprovalStageApprover.employeeId, CategoryVersion.createdBy) — a real
   constraint that can't span two separate Postgres databases once `auth-service` owns
   `Employee`/`Organization`. Each was edited to a plain, unenforced integer column before being
   replayed; same-service references (`categories`, `claims`, `expenses`, `trips`, etc.) were left
   untouched. **A real, accepted consequence**: several of these used to `onDelete: CASCADE`/
   `SET NULL` off `Employee`/`Organization` — that cascade behavior is gone, the same category of gap
   already flagged for `AiExtractionLog`'s own cross-service columns below.

   `20260710120000-seed-default-categories.js` (backfills every org with 4 sample categories) had a
   subtler version of the same problem — it queries `organizations` directly to find every org to
   backfill. Fixed by having it open a second, throwaway `pg` connection straight to `auth-service`'s
   database (env-configurable, defaulting to the local `postgres-auth` container) just for that one
   read, then writing to claim-service's own tables normally — a one-off migration-time read, not a
   new runtime dependency.

   **`AiExtractionLog` migrated in the same pass, but sideways into ai-service's new MySQL database,
   not into claim-service's new Postgres one — done.** ai-service gained its first-ever database:
   SQLAlchemy + Alembic + `pymysql` added to `pyproject.toml`, a new `mysql-ai` MySQL container
   (port `3307`), and one Alembic migration creating `ai_extraction_logs` with the exact same
   columns as the original Postgres table (camelCase DB column names preserved explicitly via
   SQLAlchemy's `mapped_column("columnName", ...)`, even though the Python attribute names are
   idiomatic `snake_case`). Historical rows were migrated via a one-off script (a throwaway `pg8000`
   connection to the source Postgres table, transformed and inserted via SQLAlchemy into MySQL) —
   all 13 existing rows verified to match, then the script and its temporary dependency were deleted.
   `POST /api/extract`'s wire contract gained two fields (`claimInvoiceFileId`, `pageNumber`) so
   ai-service can write its own log row; it now owns the entire `pending` → `completed`/`failed`
   lifecycle itself, and a new `GET /api/extraction-logs?claimInvoiceFileIds=...` endpoint replaces
   what used to be claim-service's local `AiExtractionLog.findAll` query (both for the
   already-logged dedup check and the processing-status poll). Correlation is by
   `claimInvoiceFileId` + `pageNumber`, exactly as originally planned — not a live `expenseId`
   round trip.

   **Verified live end-to-end**: logged in against auth-service's real data, hit claim-service's
   category-versions endpoint and confirmed a real "created by" name resolved through the live
   cross-service `lookupEmployees` call, hit a real claim's `process-status` endpoint and confirmed
   it correctly read (migrated) extraction-log data from ai-service's MySQL database instead of a
   local table, and confirmed ai-service's `/api/extract` writes and finalizes its own log row on a
   real (unconfigured-key) call.
5. **reports-service** — **done**. Built fresh (no data migration, per this step's own framing —
   see `user-stories/028-reports.md` for the full story and completion notes), calling
   auth-service's and claim-service's stable read APIs rather than owning any data itself.

Each numbered step is its own migration: stand up the new service + DB, do a one-time data copy,
point a gateway route at the new service, verify, then remove the migrated tables/code from the old
backend. Keep the old tables un-dropped for one release cycle as a rollback safety net.

## Database per service

Three engines in play now, chosen per-service rather than uniformly:

- **auth-service and claim-service stay on PostgreSQL.** Both lean on real relational guarantees
  that would otherwise have to be reimplemented application-side: global/case-insensitive uniqueness
  (`Employee.email`, `Op.iLike` name checks), `ON DELETE CASCADE`/`SET NULL` FK behavior (claim
  children, trip→claims), `DECIMAL(12,2)` money columns (`Expense.amount`, `Claim.totalAmount`,
  `Trip.totalAmount`/`approvedAmount`), and heavy existing use of JSONB (`CategoryField.config`,
  `CategoryVersion.snapshot`, the key-sorted `stableStringify` diffing that already works around
  JSONB's own key-order quirk). Sequelize and the existing migration pattern carry over unchanged.
  Keeping Trip on Postgres alongside Claim also avoids the BSON `Decimal128` conversion risk an
  earlier version of this plan flagged for Trip's money columns — that risk is now moot since Trip
  isn't moving to Mongo.
- **communications-service moves to MongoDB.** A strong fit — delivery records from different
  providers (SMTP vs. WhatsApp Business API/Twilio) have genuinely different, evolving response
  shapes that suit a flexible document schema better than a rigid table, and it owns no meaningfully
  relational data.
- **ai-service gets its own MySQL database, holding just `AiExtractionLog` — done.** A real new
  dependency for a codebase that previously had none: SQLAlchemy + Alembic + `pymysql` added to
  `pyproject.toml`, a new `mysql-ai` container (port `3307`), one Alembic migration.
  **The one real design consequence: `AiExtractionLog`'s columns pointing at claim-service's tables
  (`claimInvoiceFileId`, `expenseId`, `suggestedCategoryId`) are plain, unenforced integer columns,
  not real foreign keys** — MySQL can't enforce a foreign key into a different database on a
  different engine. **Correlating an `AiExtractionLog` row back to a `Claim`/`Expense` is done by
  matching `claimInvoiceFileId` + `pageNumber`** (both sides already have these — `Expense` itself
  carries `sourceInvoiceFileId`/`sourcePageNumber`, see `claim-service/CLAUDE.md`'s Claim Management
  section), not by ai-service tracking a live `expenseId` FK that claim-service would otherwise have
  to write back after the fact. This avoids a synchronous "tell ai-service which Expense resulted"
  round trip in the write path, at the cost of any read that wants log+expense together needing an
  application-level join across two services instead of a SQL join.
- **claim-service stays on Postgres — done**, same reasoning as auth-service (relational
  guarantees, JSONB, money columns) — its own dedicated database, not the monolith's shared one.
- **reports-service has no database initially**, per its deferred, API-fan-out design.

Running three DB engines (Postgres, MongoDB, MySQL) means three sets of operational tooling
(backups, monitoring, migrations) instead of one — a real, ongoing cost, not a one-time setup tax.
Postgres and MySQL both being relational only helps at the schema-design level (JSON columns instead
of JSONB, similar `DECIMAL` support) — it doesn't reduce the number of connection pools, backup jobs,
or monitoring dashboards you're running.

## Infrastructure this needs that doesn't exist yet

- **An API gateway / reverse proxy** in front of all four services, so the frontend keeps hitting
  one origin — **now done** (`gateway-service/`, `http://localhost:4400`): `/api/auth/*` (+ grades/
  departments/roles/associated-organizations/employees/projects/airlines) → auth-service,
  `/api/claims/*` + `/api/categories/*` + `/api/trips/*` + `/api/countries/*` + `/api/cities/*` +
  `/api/expenses/*` → claim-service, `/api/reports/*` → reports-service. This also solves the
  httpOnly-cookie-across-services problem for free, since the browser only ever talks to the
  gateway's own domain — see `docs/PLANS/microservices-frontend-integration-plan.md`'s completion
  notes for how it was built.
- **Three Postgres databases now in `docker-compose.yml` — all done**: `postgres` (the original,
  now retired-in-place, kept as a rollback safety net), `postgres-auth` (`5433`), `postgres-claim`
  (`5434`). Plus one MongoDB instance for communications-service and one MySQL instance for
  ai-service (`mysql-ai`, `3307`) — also both done. Each Postgres service keeps its own migrations
  directory, mirroring the existing "two config sources" pattern (`env.ts` + `config.js`, see
  `claim-service/CLAUDE.md`) — consistent with this repo's existing "no shared workspace tooling"
  convention (root `CLAUDE.md`). Small shared utilities (JWT verification, error-handler response
  shape) are duplicated per service rather than pulled into a new shared package, for the same
  reason — confirmed workable in practice: `auth-service`'s and `claim-service`'s copies of
  `error-handler.ts`/`require-auth.ts`-equivalent logic are near-identical to each other,
  deliberately.
- **ai-service's `pyproject.toml` gained real dependencies for the first time — done**: SQLAlchemy,
  Alembic, `pymysql`. The bigger jump of any change in this plan for that service — every other
  service already had an ORM/migration story to extend; ai-service started from zero.
- **Object storage for invoice files** — still a real, open gap, now more directly relevant since
  claim-service is a standalone service. `invoice-file-storage.ts` still writes to local disk
  (`claim-service/uploads/claims/`, moved with the directory rename but not re-architected). Once
  claim-service runs as more than one instance, this stops working — recommend S3 (or MinIO locally)
  as a near-term companion change, not a hard blocker for anything already done.
- **Basic retry/timeout handling** on the new service-to-service calls (anything→communications) —
  these were in-process function calls before; now they're network calls that can fail independently
  of the request they're part of.

## Open risks / things to revisit

- Stateless JWT verification means suspend/deactivate/logout has a delay bounded by access-token
  TTL across every service, not just auth-service — mitigated by keeping TTLs short once refresh
  (Phase 2) exists, not eliminated.
- Reports' "call other services' APIs on demand" approach is deliberately deferred/simple — it will
  not hold up under real reporting volume or complex cross-domain aggregation. Revisit with
  event-driven materialized views (requires standing up a message broker — real new infrastructure)
  once actual report requirements and volume are known.
- No existing test suite exists in `claim-service/` (or any service) today (`npm test`/Python
  equivalents are stubs) — extracting services without regression coverage was higher risk than
  normal throughout Phases 1-4; consider adding contract/integration tests around each domain's API
  surface now that the split is mostly done, rather than continuing to defer it.
- `AiExtractionLog`'s `claimInvoiceFileId`/`expenseId` losing real FK enforcement (see "Database per
  service" above) means an orphaned log row (its `ClaimInvoiceFile`/`Expense` deleted in
  claim-service) is now possible with no database constraint to prevent or even flag it — worth a
  periodic reconciliation check if audit-trail completeness ever matters for compliance, not just a
  debugging aid.
- **Same class of gap, now also true for claim-service's own cross-service columns** —
  `Category`/`Trip`/`Claim`/`Expense`/`ExpenseSplitRequest*`/`CategoryApprovalStageApprover`'s
  columns pointing at `Organization`/`Employee` (in auth-service) lost their `ON DELETE
  CASCADE`/`SET NULL` behavior when their FK constraints were stripped during Phase 4's migration.
  A deleted Employee no longer cascade-deletes their Trips/Claims/etc. — an orphaned row is now
  possible where the schema used to make it structurally impossible. Same mitigation as above: a
  periodic reconciliation job, not solved by this plan as written.
