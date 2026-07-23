# Microservices Extraction Plan

Status: proposed, not started. This is a plan document — no code has been extracted yet.

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

1. **communications-service first.** Proves the deployment/CI pattern with the least risk.
   `mailer.ts`/`sms.ts`/`employee-invite-mailer.ts`/`split-request-mailer.ts` become HTTP calls from
   the monolith. Add WhatsApp here as a new second channel alongside email (there is no existing
   WhatsApp code to migrate — `sms.ts` today is a `console.log` dev stub).
2. **Implement `POST /api/auth/refresh`** in the still-monolithic backend, before splitting Auth
   out. `backend/CLAUDE.md` already documents that a `refreshToken` is issued on registration
   completion but there is no endpoint to redeem it yet. Doing this while everything is still one
   DB/one transaction is much cheaper than doing it mid-split, and it's required to make short-lived
   stateless JWTs workable (see above).
3. **auth-service.** Highest effort — everything else depends on it — but extracting it early means
   claim-service gets built against a stable JWT contract from day one instead of migrating twice.
   Requires a real one-time data migration of the identity tables (16 tables) into a new database;
   there is real existing data (employees, org config), not a greenfield migration.
4. **claim-service.** The biggest single migration — Category (10 tables) + Claim/Expense/file/
   split-request tables + Trip/Country/City, all moving together into one new Postgres database.
   Because everything stays on Postgres and Trip/Claim stay in the same service, this is a
   straightforward row-for-row schema migration for these tables, not a data-model transformation —
   no rollup logic changes, no engine conversion. Note: real uploaded invoice files exist on disk
   under `backend/uploads/claims/` for specific claim ids — these need to move alongside the DB
   rows, not just the rows themselves.

   **`AiExtractionLog` migrates in the same pass, but sideways into ai-service's new MySQL database,
   not into claim-service's new Postgres one** — there's no reason to move it monolith→claim-service
   Postgres and then claim-service→ai-service MySQL a second time later, so this is the one point in
   the whole plan where a table's *engine* changes as part of its migration, not just its host
   service. Concretely, at this phase:
   - Stand up ai-service's MySQL database, add `AiExtractionLog`'s schema there (see "Database per
     service" below for the ORM/migration tooling this requires — ai-service currently has none).
   - Copy the historical `AiExtractionLog` rows from the monolith's Postgres table into it.
   - Change `claim-ai.controller.ts` (moving into claim-service) to stop writing `AiExtractionLog`
     rows itself — ai-service now creates the `pending` row and updates it to `completed`/`failed`
     around its own `/api/extract` call, since it owns the table.
   - Change claim-service's own process-status polling (`GET /:id/process-status`) to read
     extraction status from a new ai-service read endpoint instead of querying its own DB — this is
     the one place a previously-local DB query becomes a network call.
5. **reports-service**, built fresh once auth-service and claim-service have stable, documented read
   APIs.

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
- **ai-service gets its own MySQL database, holding just `AiExtractionLog`.** This is a real new
  dependency for a codebase that currently has none: `ai-service/CLAUDE.md` explicitly says "no
  database connection, no ORM models" today, so this means adding a Python ORM (SQLAlchemy is the
  standard choice), a migration tool (Alembic, SQLAlchemy's usual companion), and a MySQL driver
  (e.g. `pymysql` or `asyncmy`) — none of which exist in `ai-service/pyproject.toml` today.
  **The one real design consequence: `AiExtractionLog`'s two FKs stop being real foreign keys.**
  `claimInvoiceFileId` (→ `ClaimInvoiceFile`) and `expenseId` (→ `Expense`) both point at tables that
  stay in claim-service's Postgres — MySQL can't enforce a foreign key into a different database in
  a different engine, so both become plain, unenforced integer columns from ai-service's point of
  view. **Correlating an `AiExtractionLog` row back to a `Claim`/`Expense` therefore has to happen by
  matching `claimInvoiceFileId` + `pageNumber`** (both sides already have these — `Expense` itself
  carries `sourceInvoiceFileId`/`sourcePageNumber`, see `backend/CLAUDE.md`'s Claim Management
  section), not by ai-service tracking a live `expenseId` FK that claim-service would otherwise have
  to write back after the fact. This avoids a synchronous "tell ai-service which Expense resulted"
  round trip in the write path, at the cost of any read that wants log+expense together needing an
  application-level join across two services instead of a SQL join.
- **reports-service has no database initially**, per its deferred, API-fan-out design.

Running three DB engines (Postgres, MongoDB, MySQL) means three sets of operational tooling
(backups, monitoring, migrations) instead of one — a real, ongoing cost, not a one-time setup tax.
Postgres and MySQL both being relational only helps at the schema-design level (JSON columns instead
of JSONB, similar `DECIMAL` support) — it doesn't reduce the number of connection pools, backup jobs,
or monitoring dashboards you're running.

## Infrastructure this needs that doesn't exist yet

- **An API gateway / reverse proxy** in front of all four services, so the frontend keeps hitting
  one origin: `/api/auth/*` (+ grades/departments/roles/associated-organizations/employees/projects/
  airlines) → auth-service, `/api/claims/*` + `/api/categories/*` + `/api/trips/*` +
  `/api/countries/*` + `/api/cities/*` → claim-service, `/api/reports/*` → reports-service. This
  also solves the httpOnly-cookie-across-services problem for free, since the browser only ever
  talks to the gateway's own domain.
- **Two new Postgres databases added to `docker-compose.yml`** (auth, claim) plus one MongoDB
  instance for communications-service and **one MySQL instance for ai-service**. Each Postgres
  service keeps its own migrations directory, mirroring the existing "two config sources" pattern
  (`env.ts` + `config.js`, see `backend/CLAUDE.md`) — consistent with this repo's existing "no
  shared workspace tooling" convention (root `CLAUDE.md`). Small shared utilities (JWT verification,
  error-handler response shape) should be duplicated per service rather than pulled into a new
  shared package, for the same reason.
- **ai-service's `pyproject.toml` gains real dependencies for the first time**: an ORM (SQLAlchemy),
  a migration tool (Alembic), and a MySQL driver. This is a bigger jump for `ai-service` than any
  other change in this plan — every other service already has an ORM/migration story to extend;
  ai-service is starting from zero.
- **Object storage for invoice files.** `invoice-file-storage.ts` writes to local disk today — an
  already-documented accepted limitation at single-instance scale. Since claim-service is
  specifically the service you want to scale independently, local disk stops being viable once it
  runs as more than one instance. Recommend S3 (or MinIO locally) as a companion change at the point
  claim-service is extracted (Phase 4) — not a hard blocker for the rest of the plan.
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
- No existing test suite exists in `backend/` today (`npm test` is a stub) — extracting services
  without regression coverage is higher risk than normal; consider adding contract/integration tests
  around each domain's API surface before/while extracting it, not after.
- `AiExtractionLog`'s `claimInvoiceFileId`/`expenseId` losing real FK enforcement (see "Database per
  service" above) means an orphaned log row (its `ClaimInvoiceFile`/`Expense` deleted in
  claim-service) is now possible with no database constraint to prevent or even flag it — worth a
  periodic reconciliation check if audit-trail completeness ever matters for compliance, not just a
  debugging aid.
