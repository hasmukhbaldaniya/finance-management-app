# 020 - Trip Details

**Status:** Draft
**Epic:** Trip Management

## Overview

Covers the screen reached by clicking a trip's name on "My Trips" (`019-trip-listing.md`) — a read-only Trip Overview panel plus an expense list for that trip, which this story's reference screenshot showed always empty (`"No expenses added yet"`) since nothing could log an expense against a trip yet. Neither `018-trip-creation.md` nor `019-trip-listing.md` specified this destination; both left "what happens when you click a trip row" unresolved (`019`'s own Out of Scope explicitly called out "A Trip Details page" as a gap `016` had already filled for Category Management before this story existed for Trips). This story fills that gap.

**Updated alongside Claim Management (`022`–`027`), not part of this story's own original scope**: the expense list is no longer unconditionally empty. Once at least one Claim is linked to this trip (via Claim Type "Link to Trip") and has a saved expense, this page's left panel shows a real, flattened list of every `Expense` across every `Claim` linked to this trip — one row per expense (Category, Expense Date, Amount), not grouped by claim, and deliberately without a Claim column even though the API still returns each row's originating claim id/name in case a future screen wants it. The `"No expenses added yet"` empty state still covers the zero-linked-claims case exactly as this story originally specified.

**The reference screenshot's breadcrumb reads "My Trips / View Trip Claim," not "View Trip Details."** That wording is carried through as-is rather than silently "corrected" to match this epic's own naming — it strongly suggests the underlying product treats a Trip and its expense-claim as the same conceptual object (a trip *is* what gets claimed), which would explain why an expense list lives on this same screen rather than on some separate Claim entity. This doc doesn't resolve that naming question one way or the other — see [Open Questions](#open-questions--assumptions).

**The Trip Overview panel's "Edit" button is `021-trip-edit.md`'s concern** — it's enabled only while the trip's status is `"new"`, per that story.

---

## Story: View Trip Details

**As a** logged-in employee
**I want to** see a trip's full details and its logged expenses
**So that** I can review what I set up and eventually add expenses against it

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| Trip Details | Breadcrumb: "My Trips / View Trip Claim" | — | "My Trips" links back to `019`'s listing |
| Trip Details | Page title: Trip Name | heading | e.g. "Happy test cases" |
| Trip Details (left panel) | Expense list | list, empty until a linked claim has a saved expense | One row per `Expense` across every `Claim` linked to this trip — Category, Expense Date, Amount (no Claim column). See Flow point 2. |
| Trip Details (right panel) | "Trip Overview" card title + "Edit" button | — | Enabled only when status is `"new"` — see `021-trip-edit.md` |
| Trip Details (right panel) | Trip ID | read-only text | The same reference number shown in `019`'s `(#N)` on the listing — confirms that number is the trip's own database id |
| Trip Details (right panel) | Trip Name | read-only text | |
| Trip Details (right panel) | Start Date & Time | read-only text | Formatted "D MMM YYYY at hh:mm AM/PM", e.g. "15 Jul 2026 at 02:00 AM" — a different format than `019`'s own listing rows use for the same underlying value; see [Open Questions](#open-questions--assumptions) |
| Trip Details (right panel) | End Date & Time | read-only text | Same format as Start Date & Time |
| Trip Details (right panel) | Start Location | read-only text | Country flag icon + city name |
| Trip Details (right panel) | End Location | read-only text | Country flag icon + city name |
| Trip Details (right panel) | Created On | read-only text | Date only (no time), formatted "DD Mon YYYY", e.g. "09 Jul 2026" — again a different format than the listing's own "Created Date" (which includes a time) |

### Flow

1. Clicking a trip's name on the "My Trips" listing (`019`) navigates here, loading that specific trip's full details.
2. **The expense list was always empty when this story was first written** — "No expenses added yet" / "No expenses have been added to this claim." rendered unconditionally, since logging an expense against a trip was a future Claims/Expenses story's concern at the time (see [Out of Scope](#out-of-scope)). **Claim Management (`022`–`027`) has since filled that gap**: every `Claim` with Claim Type "Link to Trip" pointing at this trip contributes its own saved `Expense` rows here, read live off `Claim.tripId` (no backfill needed — a claim linked before this shipped shows up automatically). The empty state still covers the case where no claim has been linked yet, or none of the linked claims have a saved expense.
3. The Trip Overview panel is entirely read-only display — every field is exactly what `018` collected at creation (or, once `018`'s own gap is resolved, whatever a future Edit flow changed it to) plus `Created On`.
4. Clicking "My Trips" in the breadcrumb returns to `019`'s listing.
5. Clicking "Edit" is acknowledged as an entry point into changing the trip, but this story does not specify that flow's behavior — see [Out of Scope](#out-of-scope).

### Validation Rules

Not applicable — this screen has no form fields; every value is read-only.

### Acceptance Criteria

- **Given** a trip with no expenses (every trip, since expense-logging doesn't exist yet), **when** its Trip Details page loads, **then** the left panel shows "No expenses added yet."
- **Given** a trip's details are loaded, **when** the Trip Overview panel renders, **then** it shows Trip ID, Trip Name, Start/End Date & Time, Start/End Location, and Created On, matching what `018` persisted for that trip.
- **Given** the Trip Details page, **when** "My Trips" in the breadcrumb is clicked, **then** the employee returns to `019`'s listing.
- **Given** a trip belonging to a different employee, **when** its Trip Details URL is requested directly, **then** it's rejected the same way `019`'s own per-employee isolation already works (404, not 403 — matching this codebase's existing "don't reveal existence" convention for cross-tenant lookups).

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Failed to load trip details | "Something went wrong. Please try again." |
| Trip not found (deleted, or belongs to another employee) | "This trip could not be found." |

---

## API Design

| Method | Path | Body / Query | Response (success) |
|--------|------|---------------|---------------------|
| GET | `/api/trips/:id` | — | `{ trip: { id, name, status, createdAt, startAt, endAt, startCity: { name, countryName, countryCode }, endCity: { name, countryName, countryCode }, totalAmount, approvedAmount }, expenses: [{ id, claimId, claimName, categoryName, amount, expenseDate }] }` — 404 if not found or not owned by the caller |

No write endpoint in this story — nothing here changes trip data (Edit is out of scope; see below). `startCity`/`endCity` are returned as objects rather than bare ids so this screen doesn't need a second round-trip to `GET /api/cities` just to show a name — the same "one endpoint, everything it needs" posture `013`'s shared category-detail endpoint already established, scaled down to a single record. **`expenses`** was added alongside Claim Management — every `Expense` across every `Claim` with this trip's id as `tripId`, one row per expense; `claimId`/`claimName` are included even though this page's own UI doesn't render a Claim column, in case a future screen wants them.

## Data Model

No new tables. Reads the same `Trip`/`City`/`Country` tables `018`/`019` already define, plus (added alongside Claim Management) `Claim`/`Expense`/`Category` — joined read-only, purely to assemble the `expenses` array above; nothing on this page writes to any of them.

## Validation Rules Summary

Not applicable.

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| TD-01 | Click a trip name on My Trips | Navigates to Trip Details for that trip |
| TD-02 | View a trip with no linked claims (or linked claims with no saved expenses) | Expense list shows "No expenses added yet" |
| TD-02b | View a trip with one linked claim that has 2 saved expenses | Expense list shows 2 rows (Category, Expense Date, Amount), no Claim column |
| TD-02c | View a trip with two separate claims linked to it, each with expenses | Expense list shows every expense from both claims, flattened into one list |
| TD-03 | View a trip's Trip Overview panel | Trip ID, Name, Start/End Date & Time, Start/End Location, Created On all match what was set at creation |
| TD-04 | Click "My Trips" in the breadcrumb | Returns to the listing |
| TD-05 | Request `GET /api/trips/:id` for a trip belonging to a different employee | 404, "This trip could not be found." |
| TD-06 | Request `GET /api/trips/:id` for a trip id that never existed | 404, "This trip could not be found." |

## Edge Cases

| Scenario | Expected Result |
|----------|------------------|
| Start Location and End Location are the same city (a round trip, valid per `018`) | Both fields show the same city/flag, rendered independently — no special-cased "round trip" messaging |
| A trip's name contains characters that need escaping in the page title/heading | Rendered as plain text, no injection risk (same posture as every other user-supplied display string in this codebase) |

## Out of Scope

- ~~**Logging expenses against a trip**~~ — resolved by Claim Management (`022`–`027`); see this doc's Overview. This story's own scope still only specifies the empty state — the real list's own behavior (one row per expense, no Claim column, `Trip.status`/`totalAmount` auto-updating) is specified in the Claim Management docs, not re-specified here.
- **The "Edit" button's actual behavior** — resolved by `021-trip-edit.md`: enabled only while status is `"new"`, reopening `018`'s Create Trip form pre-filled.
- **Whatever "View Trip Claim" implies about Trip/Claim being the same or related entities** — this doc preserves the screenshot's own wording without resolving the underlying data-model question (see [Open Questions](#open-questions--assumptions)).
- Any action beyond viewing and navigating back (no delete, no status change, no approval action anywhere on this screen).

## Open Questions / Assumptions

- ~~**Is "Claim" here just this screen's label for a Trip, or a genuinely separate entity a Trip owns?**~~ **Resolved by Claim Management**: `Claim` is a genuinely separate entity, not a Trip alias — one Trip can have *multiple* Claims linked to it (Claim Type "Link to Trip", `Claim.tripId`), each with its own expenses, status, and lifecycle independent of the Trip. This page's expense list is the flattened union of every linked Claim's expenses, not "the" one claim a trip owns. The breadcrumb's "View Trip Claim" wording and the empty state's "this claim" copy both turned out to be informal, pre-Claim-Management phrasing rather than a hint at a 1:1 relationship — left as-is here since neither is incorrect, just imprecise.
- **Two different date/time display formats for the same underlying `startAt`/`createdAt` values, across two different screens** (`019`'s listing rows vs. this page's Trip Overview) — reproduced faithfully from the reference screenshots rather than unified, since nothing indicates this was unintentional, but worth a deliberate look before implementation locks it in as two separate formatting code paths.
- **Country flag icon next to Start/End Location** — new to this story (neither `018` nor `019` mention a flag icon anywhere); requires `City`/`Country` responses to carry enough to render one (assumed: `Country.code`, an ISO alpha-2 already in the schema per `018`'s Data Model, is enough to render a flag via a standard emoji-flag-from-country-code mapping).
- **Row-click target**: this story assumes the *entire* trip name/row is clickable and navigates here, matching `019`'s own note that a details destination was an acknowledged-but-unspecified gap — confirm nothing else on the row (status badge, amount chips) should instead be its own separate click target.
