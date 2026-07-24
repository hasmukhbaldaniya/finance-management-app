# 028 - Reports

**Status:** Done — see Completion notes at the end of this document
**Epic:** Reports

## Overview

Originally scoped as the "Reports" nav destination (`frontend/src/app/(private)/reports/page.tsx`, a bare `<ComingSoon title="Reports" />` per [003-header-navigation.md](./003-header-navigation.md)) — three read-only, organization-wide reports a Company Administrator uses to see spend and trip activity across every employee, not just their own. This is Phase 5 of `docs/PLANS/microservices-plan.md`, built as a new `reports-service` with no database of its own, aggregating over `auth-service`'s and `claim-service`'s own APIs (`docs/PLANS/microservices-frontend-integration-plan.md` section 1.1/1.4e).

**Relocated after first shipping** (explicit request, same day): the standalone `/reports` route and its "Reports" nav item are gone — these three reports now render directly on the Home/Dashboard page (`frontend/src/app/(private)/dashboard/page.tsx`), below the existing welcome/organization header. The nav's "Home" label was renamed to "Dashboard" at the same time. `ROUTES.REPORTS`, the `/reports/:path*` proxy matcher, and the `(private)/reports/` directory were all removed — nothing else in this doc changes (same `reports-service` API, same components, just a different page hosting them).

**Deliberately scoped with zero dependency on approval-workflow status or data** — [029-claim-trip-approvals.md](./029-claim-trip-approvals.md) (Claim/Trip Approvals) is a separate epic, currently **on hold**. Nothing in this story reads `pending_for_approval`/`ready_for_submission`/`approved_for_reimbursement`/a future `rejected` status, or `Trip.approvedAmount` — only data that exists and is populated today.

**This story has a hard prerequisite that doesn't exist yet and must land first**: every claim/trip/expense read endpoint on `claim-service` today (`listClaims`, `listTrips`) is scoped to `{ employeeId: req.userId }` — "my own records only." There is no organization-wide read endpoint for claims, trips, or expenses anywhere in the codebase. See [Prerequisite: Organization-Wide Read Access](#prerequisite-organization-wide-read-access) below.

---

## Prerequisite: Organization-Wide Read Access

**New, on `claim-service`:**
- `GET /api/claims/org` — every claim in the caller's organization (not just the caller's own), with the same filter shape `listClaims` already supports (`status`, `createdDate`, `search`) plus new ones this epic needs: `employeeId`, `categoryId`, date range (`from`/`to`, not just a single day), pagination.
- `GET /api/trips/org` — same shape, for trips.
- `GET /api/expenses/org` — org-wide expense listing (currently expenses are only ever read as a sub-resource of a single claim via `saveExpenses`/claim detail — there is no standalone expense listing endpoint at all today, org-wide or otherwise). Needs `categoryId`, `isRedFlagged`, date range, pagination.

**Access control decision:** gate these behind the same check `auth-service`'s `listEmployees`/`requireOwner` already establishes (`Employee.isOwner`) — **not** the `reports` privilege named in [006-roles-and-privileges-management.md](./006-roles-and-privileges-management.md)'s privilege table, since that story's own text says the Role/privilege entity "isn't wired to any enforcement yet." Wiring real privilege-based access is a bigger, separate piece of work; `isOwner` is the only access-control mechanism that actually exists anywhere in this codebase today, so v1 matches every other admin-only surface already built this way.

**How `claim-service` checks `isOwner` without a cross-service call on every request:** embed `isOwner` in the access-token JWT payload at issue time (`auth-service`), the same way `organizationId` already is (`docs/PLANS/microservices-frontend-integration-plan.md` section 1.3's "single biggest cross-service simplification"). Every service already verifies this JWT statelessly; reading one more boolean claim off it costs nothing and needs no new cross-service call, unlike `claim-service`'s existing `auth.service.ts` lookups (which are for data it genuinely doesn't have, not a yes/no permission check). **Open question:** does an already-issued token need to be invalidated if `isOwner` changes mid-session? Same trade-off section 1.3 already accepts for `organizationId` — not new here, just flagging it applies to this claim too.

---

## Story: Expense Summary by Category

**As a** Company Administrator
**I want** total and count of expenses per category, across the whole organization, for a date range
**So that** I can see where spend is concentrated without opening every claim individually

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Reports > Expense Summary | Date range | date range picker | No (defaults to current month) |
| Reports > Expense Summary | Department filter | multi-select dropdown | No |
| Reports > Expense Summary | Category summary table | table: Category, Expense Count, Total Amount | — |

### Flow

1. Company Administrator opens Reports > Expense Summary (default landing tab under Reports, since it's the most direct read of existing data).
2. Page loads with the default date range (current month) — a table of every enabled category with its expense count and total amount for that range, org-wide.
3. Changing the date range or department filter re-fetches and re-renders the table.
4. Categories with zero expenses in the selected range still appear, with `0`/`₹0` — not silently omitted, so an administrator can see a category had no activity rather than wondering if it's missing.

### Validation Rules

| Field | Rule |
|-------|------|
| Date range | `to` must not be before `from`. No explicit max range — **Open Question**: should a very wide range (e.g. multi-year) be capped for performance, given this aggregates in memory with no DB of its own? |

### Acceptance Criteria

- **Given** the default date range, **when** the report loads, **then** every enabled category appears exactly once, sorted by Total Amount descending.
- **Given** a department filter is applied, **when** the report re-fetches, **then** only expenses whose claim's employee belongs to a selected department are counted (requires joining `claim-service`'s `employeeId` against `auth-service`'s Employee → Department — see Open Questions on how `reports-service` resolves this join).

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Report fails to load | "Something went wrong loading this report. Please try again." (matches `apiManager.ts`'s `GENERIC_ERROR_MESSAGE` convention) |

---

## Story: Trip Cost Report

**As a** Company Administrator
**I want** every trip's total cost, by status and date range
**So that** I can see trip spend across the organization without opening every trip individually

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Reports > Trip Cost | Date range (by `startAt`) | date range picker | No (defaults to current month) |
| Reports > Trip Cost | Status filter | dropdown (Trip's existing status domain) | No |
| Reports > Trip Cost | Trip list | table: Trip Name, Employee, Dates, Status, Total Amount | — |

### Flow

1. Table lists every trip in the org matching the filters, one row per trip (not aggregated — unlike Expense Summary above, this is a detail list).

**Deliberately excludes `Trip.approvedAmount`/a Variance column** — that field is only ever meaningful once the Approvals epic (currently on hold) sets it; showing a column that's `—` for every single row today isn't useful. Add it back when 029 resumes.

### Validation Rules

Same date-range rule as above.

### Acceptance Criteria

- **Given** the default date range, **when** the report loads, **then** every trip in range appears once, sorted by Total Amount descending.

### Error / Toast Messages

Same generic message as above.

---

## Story: Red-Flagged Expenses Report

**As a** Company Administrator
**I want** a list of every expense marked `isRedFlagged`, org-wide
**So that** I can review flagged expenses (duplicate-bill detections, per [022](./022-claim-creation-manual.md)/[023](./023-claim-creation-ai-powered.md)) in one place instead of finding them claim-by-claim

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Reports > Red-Flagged Expenses | Date range (by `expenseDate`) | date range picker | No (defaults to current month) |
| Reports > Red-Flagged Expenses | Expense list | table: Employee, Claim, Category, Amount, Date, Red Flag Reason | — |

### Flow

1. Table lists every expense with `isRedFlagged: true` matching the date range, with `redFlagReason` shown verbatim (the free-text reason already captured at flag time — see `expense.model.ts`).
2. Clicking a row navigates to that claim's detail page (existing claim-detail screen, no new UI needed there).

### Validation Rules

Same date-range rule as above.

### Acceptance Criteria

- **Given** an expense with `isRedFlagged: true` and a non-null `redFlagReason`, **when** it appears in this report, **then** the reason is shown exactly as stored, not truncated or reworded.

### Error / Toast Messages

Same generic message as above.

---

## Validation Rules Summary

| Field | Rule |
|-------|------|
| Any date range in this epic | `to` must not be before `from`; no max range enforced in v1 (see per-report Open Questions on performance). |

## Out of Scope

- Export (CSV/PDF) of any report — no story requested this; flag as a likely fast-follow once the read-only views themselves are confirmed useful.
- Charts/graphs — all reports above are tables in this story; visual charting is a separate, later decision.
- **Claim Status / Aging report, Approvals-derived data, and the `Finance` nav item/`finance_view` privilege (006)** — all deliberately excluded. [029-claim-trip-approvals.md](./029-claim-trip-approvals.md) is on hold; nothing in this story depends on it, references its statuses, or waits on it.
- Real privilege-based access control (the `reports` privilege from 006) — v1 uses `isOwner`, see the Prerequisite section's access-control decision.
- Department-level breakdown requires joining `claim-service` claim/expense data against `auth-service`'s Employee → Department — **Open Question**: does `reports-service` call `auth-service`'s existing `listEmployees` (org-wide, already exists) once per report request and join in memory, or does `claim-service`'s new `/org` endpoints accept and resolve a `departmentId` filter server-side (which would itself require `claim-service` to call `auth-service`, an extra cross-service hop per request)? Recommend the former (join in `reports-service`, the one place already designed to aggregate across services) unless request volume makes that impractical.

## Open Questions / Assumptions

- Should any of these reports be visible to non-owner roles once 006's Role/privilege system is actually wired to enforcement anywhere? Out of scope for v1 (see Prerequisite section) but worth deciding before a second admin-adjacent role is introduced.
- Max date-range / pagination limits for the org-wide endpoints, given `reports-service` aggregates in memory with no DB of its own — needs a concrete cap before this goes to a real-sized organization's data. **Resolved for v1**: capped at 20 pages × 100 rows = 2,000 rows per source per report request (`reports-service/src/services/upstream-client.ts`'s `MAX_PAGES`) — no UI-facing max-range enforcement yet, just a backend safety bound.

## Completion notes

Built exactly as scoped, plus the prerequisite section — `requireOwner` (reading `isOwner` off the JWT, embedded at issue time in `auth-service` alongside `organizationId`) gates three new `claim-service` endpoints (`GET /claims/org`, `/trips/org`, and a genuinely new `/expenses/org` — there was no standalone expense listing anywhere in the codebase before this), and `reports-service` (no DB, `http://localhost:4500`) forwards the caller's own session cookie to those plus `auth-service`'s existing `listEmployees`/`listDepartments` and `claim-service`'s existing `listCategories`, aggregating in memory.

**Department filter, resolved**: `reports-service` joins in memory (the recommended option from this doc's own Out of Scope section) — `auth-service`'s `GET /employees` excludes the caller's own record (built for the Employee Listing page, "everyone but me"), which would have silently dropped the caller's own expenses from a department breakdown; fixed by also fetching `GET /employees/me` and merging it into the lookup map.

**One real deviation working through this**: `frontend/.env` and `frontend/.env.local` both needed the same env var update — Next.js loads `.env.local` with higher priority, and it already had the pre-gateway direct-to-claim-service URL, so the first attempt (editing only `.env`) silently did nothing. Not specific to Reports, but worth remembering for the next env-var change to this frontend.

Verified end-to-end: real cross-employee data in all three reports (not just the caller's own records), a non-owner caller's request correctly 403s with `claim-service`'s own `requireOwner` message (not a generic error, confirming `UpstreamError` status/message propagation works), and a real browser session — login → Reports page → switch tabs — rendered all three reports with live data, `tsc`/`eslint` clean on every new file, no console errors beyond two confirmed pre-existing, unrelated issues (a hydration warning already present on `/dashboard`, and a transient 401 during the login redirect itself).

**Post-relocation re-verification** (same day, see the relocation note above): confirmed `/reports` now 404s, `/dashboard` renders the welcome header + organization card + all three report tabs together with live data, the nav shows "Dashboard" not "Home" with no separate "Reports" item, `tsc`/`eslint` clean on every changed file (`dashboard/page.tsx`, `header.tsx`, `proxy.ts`, `route.constant.ts`), and a stale `.next/types/validator.ts` reference to the deleted route (a build-cache artifact, not a real error) cleared itself after removing `.next`.
