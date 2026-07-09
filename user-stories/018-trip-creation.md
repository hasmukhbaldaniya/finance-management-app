# 018 - Trip Creation

**Status:** Draft
**Epic:** Trip Management

## Overview

Covers the "Create Trip" screen under the top-level **Trips** nav item — currently a bare `<ComingSoon title="Trips" />` placeholder (`frontend/src/app/(private)/trips/page.tsx`), the last of the original placeholder list besides Claims/Approvals/Finance/Reports (see `user-stories/003-header-navigation.md`'s Out of Scope). A Trip is the top-level record an employee creates before logging any expenses against it — name, when it runs, and where it starts/ends. **This story covers creating a trip only.** What happens afterward — the real "My Trips" listing with search/filters/pagination, deleting a still-Draft trip, and everything about logging expenses/claims/approvals against a trip — is `019-trip-listing.md`'s and later stories' concern, the same "creation now, full listing later" split this codebase already used for Category Management (`013` creation vs. `014` listing).

**`019-trip-listing.md` surfaced a real gap in this story that needs resolving before implementation**: its reference screenshot's sample data shows trips in a `"Draft"` status with a delete affordance, distinct from `"New"` — but this story's own Flow explicitly assumes Create Trip has **no draft-saving path** ("a single-screen, single-submit form... an abandoned Create Trip screen leaves no trace"). Either this story is missing a Save-as-Draft action, or `"Draft"`/`"New"` are meant to collapse into one status — see `019`'s Overview and Open Questions for the full writeup. Don't implement this story until that's answered.

**Any logged-in employee can create a trip for themselves** — unlike Category Management or Associated Organizations, this isn't a Company-Administrator-gated admin screen; it's every employee's own travel record, the same "self-service, not admin management" posture `012` (Employee Profile) established. A trip is only ever visible to the employee who created it in this story (no sharing/collaboration/approval workflow exists yet — see [Out of Scope](#out-of-scope)).

**New master data, seeded once, never managed through this app's UI**: a global (not organization-scoped) `Country` → `City` catalog backs the Start/End Location dropdowns, the same "fixed, seeded, global catalog, no management screen" shape `Airline` already established for Step 3's Airline picker (`008-employee-invitation.md`). See [Open Questions](#open-questions--assumptions) for the real, unresolved question of how comprehensively "all over the world's cities" gets seeded.

---

## Story: Create Trip

**As a** logged-in employee
**I want to** create a trip with its dates and start/end locations
**So that** I have a record to log expenses against later

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Create Trip | Trip Name | text | Yes |
| Create Trip | Start Date & Time | date+time picker | Yes |
| Create Trip | End Date & Time | date+time picker | Yes |
| Create Trip | Start Location | searchable single-select dropdown (city, worldwide) | Yes |
| Create Trip | End Location | searchable single-select dropdown (city, worldwide) | Yes |
| Create Trip | "Cancel" button | button → discards, returns to the Trips list | — |
| Create Trip | "Create Trip" button | button → validates, creates, returns to the Trips list | — |

Matches the reference screenshot exactly: two fields per row (Start/End Date & Time side by side, Start/End Location side by side), Trip Name full-width above them, Cancel + Create Trip as a sticky footer bottom-right.

### Flow

1. Trip Name, Start/End Date & Time, and Start/End Location are all blank on entry — there's no draft state for this story (unlike Category Creation's multi-step wizard, this is a single-screen, single-submit form; see [Open Questions](#open-questions--assumptions)).
2. **Start Location and End Location** each open a searchable dropdown listing cities worldwide, grouped/backed by the `Country` → `City` master catalog described in [Overview](#overview) — typing filters the list by city name (and, per [Validation Rules](#validation-rules) below, optionally by country name too, so searching "India" surfaces every Indian city). Each option displays as "City, Country" (e.g. "Mumbai, India") so same-named cities in different countries aren't ambiguous.
3. **Start Location and End Location may be the same city** — a round trip back to where it started is a normal, valid trip, not an error (see [Edge Cases](#edge-cases)).
4. **End Date & Time must be after Start Date & Time** — the End Date & Time picker doesn't hard-block selecting an earlier value while typing/picking, but "Create Trip" validates it and blocks submission with an inline error if it's not after the start (see [Open Questions](#open-questions--assumptions) for why "not before" was resolved as "strictly after," not "on/after").
5. **Create Trip** validates every field, persists the trip with `status: "new"` and `totalAmount: 0.00`, and returns to the Trips list — the newly created trip appears there immediately (`019-trip-listing.md` covers that list itself).
6. **Cancel** discards whatever's been typed/selected and returns to the Trips list with nothing persisted — there's no draft-saving in this story, so an abandoned Create Trip screen leaves no trace.

### Validation Rules

| Field | Rule |
|-------|------|
| Trip Name | Required. 2–100 characters. |
| Start Date & Time | Required. Any date/time (past dates allowed — an employee logging a trip after the fact is a normal case, not an error; see [Edge Cases](#edge-cases)). |
| End Date & Time | Required. Must be strictly after Start Date & Time. |
| Start Location | Required. Must be a real city from the master catalog. |
| End Location | Required. Must be a real city from the master catalog. May equal Start Location. |
| City search (Start/End Location) | Case-insensitive substring match against city name; matching by country name too is recommended (searching "India" surfaces every Indian city) but not required for a first implementation. |

### Acceptance Criteria

- **Given** a blank Trip Name, Start/End Date & Time, or Start/End Location, **when** "Create Trip" is clicked, **then** the form is blocked client-side with inline "required" errors and no request is made.
- **Given** an End Date & Time on or before the Start Date & Time, **when** "Create Trip" is clicked, **then** an inline error on the End Date & Time field blocks submission.
- **Given** valid values in every field, **when** "Create Trip" is clicked, **then** the trip is created with `status: "new"` and `totalAmount: 0.00`, and the employee returns to the Trips list seeing it there.
- **Given** the Start Location dropdown is opened, **when** the employee types part of a city name, **then** the list filters to matching cities within a moment, without a full page reload.
- **Given** the same city is selected for both Start Location and End Location, **when** "Create Trip" is clicked, **then** the trip is created without error (round trips are valid).
- **Given** the Create Trip screen has unsaved input, **when** "Cancel" is clicked, **then** nothing is persisted and the employee returns to the Trips list.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Blank Trip Name | "Trip Name is required." |
| Trip Name too short/long | "Trip Name must be between 2 and 100 characters." |
| Blank Start Date & Time | "Start Date & Time is required." |
| Blank End Date & Time | "End Date & Time is required." |
| End Date & Time not after Start Date & Time | "End Date & Time must be after the Start Date & Time." |
| Blank Start Location | "Start Location is required." |
| Blank End Location | "End Location is required." |
| Trip created | "Trip created." |
| Server/network error | "Something went wrong. Please try again." |

---

## API Design

| Method | Path | Body / Query | Response (success) |
|--------|------|---------------|---------------------|
| POST | `/api/trips` | `{ name, startAt, endAt, startCityId, endCityId }` | `{ id, status: "new", totalAmount: "0.00" }` |
| GET | `/api/countries` | — | `{ countries: [{ id, name, code }] }` |
| GET | `/api/cities?search=&countryId=` | `search` (substring match on city name), `countryId` (optional filter) | `{ cities: [{ id, name, countryId, countryName }] }` |

`GET /api/trips` (the paginated, filterable "My Trips" listing) is `019-trip-listing.md`'s own endpoint to specify — not repeated here, the same split `013`/`014` already used.

Error responses follow the existing convention (`{ error: string }`): 400 (validation failures), 401 (no session), 404 (a referenced `startCityId`/`endCityId` doesn't exist), 500 (unexpected). No `403`/owner-gate on `POST /api/trips` — any authenticated employee may create their own trips, unlike every Company-Administrator-gated endpoint elsewhere in this codebase.

## Data Model

New tables:

- **`Country`**: `id`, `name` (unique), `code` (ISO alpha-2, e.g. `"IN"`, `"US"`) — global, seeded once, no management UI, the same "fixed catalog" shape `Airline` already established.
- **`City`**: `id`, `countryId` (FK → `Country`), `name` — global, seeded once, no management UI. Unique on `(countryId, name)` — two different countries may each have a city with the same name (there's no global-uniqueness requirement on city name alone).
- **`Trip`**: `id`, `employeeId` (FK → `Employee`, who created/owns it), `organizationId` (FK → `Organization`, for consistency with every other table in this codebase even though this story's own queries scope by `employeeId`, not `organizationId`), `name`, `startAt` (timestamp), `endAt` (timestamp), `startCityId` (FK → `City`), `endCityId` (FK → `City`), `status` (string — `"new"` is the only value this story ever sets; `019` documents the fuller value domain it observed, and its Open Questions covers whether a `"draft"` state belongs here too), `totalAmount` (decimal, default `0.00` — not computed from anything in this story, just initialized), `approvedAmount` (decimal, nullable — added for `019`'s listing, populated by a future Claims/Approval story, untouched by this one), `createdAt`/`updatedAt`.

## Validation Rules Summary

| Field | Rule |
|-------|------|
| Trip Name | Required, 2–100 characters |
| Start/End Date & Time | Both required; End must be strictly after Start |
| Start/End Location | Both required; must reference a real `City` row; may be equal to each other |

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| TC-01 | Submit with every field blank | Blocked client-side, inline required errors, no request |
| TC-02 | Submit with a valid Trip Name but End Date & Time before Start Date & Time | Blocked with the End Date & Time inline error |
| TC-03 | Submit with End Date & Time exactly equal to Start Date & Time | Blocked — "after," not "on or after" (see Validation Rules) |
| TC-04 | Submit with all valid fields, Start Location ≠ End Location | Trip created, `status: "new"`, `totalAmount: 0.00` |
| TC-05 | Submit with Start Location == End Location | Trip created without error (round trip) |
| TC-06 | Type a partial city name into Start Location | Dropdown filters to matching cities |
| TC-07 | Type a city name that matches nothing | Dropdown shows an empty/no-matches state, not an error |
| TC-08 | Click Cancel after partially filling the form | Returns to Trips list, nothing persisted |
| TC-09 | Create a trip, then `GET /api/trips` (per `019`) for the same employee | New trip present with `status: "new"` and `totalAmount: "0.00"` |
| TC-10 | Employee B calls `GET /api/trips` after Employee A creates a trip | Employee A's trip is not present in Employee B's results |
| TC-11 | Submit a Trip Name of exactly 1 character | Blocked — below the 2-character minimum |
| TC-12 | Submit a Trip Name of exactly 100 characters | Accepted — at the maximum, not over it |

## Edge Cases

| Scenario | Expected Result |
|----------|------------------|
| Start Date & Time in the past | Allowed — logging a trip after it already happened is normal, not an error |
| Start Date & Time far in the future | Allowed — no upper bound specified |
| Start Location equals End Location | Allowed — a round trip is a valid trip (see Flow point 3) |
| A `City` referenced by `startCityId`/`endCityId` is later removed from the master catalog (hypothetical — no delete UI exists, but defensively) | Out of scope to design around, since there's no way to delete a `City` row anywhere in this app |
| Two different employees create trips with the identical Trip Name | Allowed — Trip Name is not unique, unlike Category Name/Grade Name elsewhere in this codebase (a trip is a personal record, not an org-wide shared lookup) |
| An employee submits a trip whose Start/End Date & Time span multiple years | Allowed — no maximum trip duration is specified |

## Out of Scope

- Logging expenses/claims against a trip, or computing `totalAmount` from anything — it's always `0.00` at creation and untouched by this story.
- Any status besides `"new"` (e.g. ongoing/completed/cancelled) and whatever triggers those transitions.
- The "My Trips" listing screen itself (search, filters, pagination, status badges, amount display) — entirely `019-trip-listing.md`'s concern.
- Editing or deleting a trip after creation — `019` covers deleting a Draft trip, `021` covers editing a still-`"new"` trip by reusing this story's own Create Trip form.
- Trip approval workflows or visibility beyond the creating employee (manager visibility, org-wide trip reporting, etc.).
- Any UI for managing the `Country`/`City` master catalog — it's seeded once, the same as `Airline`.
- Multi-currency handling for `totalAmount` — this story only ever writes a bare `0.00`, so currency formatting/symbol questions don't arise yet.

## Open Questions / Assumptions

- **How comprehensively should "all over the world's cities" be seeded?** This is the single biggest unresolved question in this story. A genuinely complete world-cities dataset is tens of thousands of rows and would realistically come from a public geographic dataset (e.g. GeoNames) rather than being hand-written — that's a real data-sourcing decision for implementation time, not something this doc can respons­ibly commit to a row count or source for. A smaller curated "major cities per country" seed (capitals + largest cities) is the pragmatic fallback if a full dataset import isn't feasible when this gets built — confirm which before implementation starts.
- **"End date don't be allow before start date" was resolved as "End must be strictly *after* Start," not "on or after."** A zero-duration trip (identical start and end timestamp) is rejected under this reading — flag if that's too strict and a same-instant trip should actually be allowed.
- **Single-screen, one-shot submit, not a multi-step wizard or a draft-save flow** — Category Creation's `013` is a 4-step wizard with Save-as-Draft specifically because it has that much configuration; this form has 5 fields and matches the reference screenshot's single "Create Trip" primary action with no draft option. **This is now a confirmed open conflict, not just a hunch** — see this doc's Overview and `019`'s own Overview/Open Questions for the "Draft" status observed in that story's reference data, which this assumption can't explain. Resolve before implementing either story.
- **A trip is visible only to the employee who created it** — assumed from the lack of any sharing/approval spec; revisit once an approvals/manager-visibility story for Trips exists, since that will likely need to broaden this.
- **No owner/Company-Administrator gate on trip creation** — assumed since a trip is a personal travel record every employee needs, not an org-config action; confirm this reading is correct.
- **`organizationId` is stored on `Trip` even though this story's own queries never filter by it** — included for consistency with the rest of this codebase's schema (every other table carries it) and to make a future org-wide trips report straightforward to add later without a migration.
