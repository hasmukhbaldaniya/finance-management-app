# 020 - Trip Details

**Status:** Draft
**Epic:** Trip Management

## Overview

Covers the screen reached by clicking a trip's name on "My Trips" (`019-trip-listing.md`) — a read-only Trip Overview panel plus an expense list for that trip, which this story's reference screenshot shows always empty (`"No expenses added yet"`). Neither `018-trip-creation.md` nor `019-trip-listing.md` specified this destination; both left "what happens when you click a trip row" unresolved (`019`'s own Out of Scope explicitly called out "A Trip Details page" as a gap `016` had already filled for Category Management before this story existed for Trips). This story fills that gap.

**The reference screenshot's breadcrumb reads "My Trips / View Trip Claim," not "View Trip Details."** That wording is carried through as-is rather than silently "corrected" to match this epic's own naming — it strongly suggests the underlying product treats a Trip and its expense-claim as the same conceptual object (a trip *is* what gets claimed), which would explain why an expense list lives on this same screen rather than on some separate Claim entity. This doc doesn't resolve that naming question one way or the other — see [Open Questions](#open-questions--assumptions).

**This story introduces a real gap of its own**: the Trip Overview panel has an **"Edit" button**, but `018`'s own Out of Scope explicitly says "Editing or deleting a trip after creation" is not covered by this epic so far (`019` covers deleting; nothing covers editing). This doc acknowledges the button exists and where it most plausibly leads, without fully specifying an Edit Trip flow — see [Out of Scope](#out-of-scope) and [Open Questions](#open-questions--assumptions).

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
| Trip Details (left panel) | Expense list | list, empty in this story | See Flow point 2 |
| Trip Details (right panel) | "Trip Overview" card title + "Edit" button | — | See [Out of Scope](#out-of-scope) for what Edit does |
| Trip Details (right panel) | Trip ID | read-only text | The same reference number shown in `019`'s `(#N)` on the listing — confirms that number is the trip's own database id |
| Trip Details (right panel) | Trip Name | read-only text | |
| Trip Details (right panel) | Start Date & Time | read-only text | Formatted "D MMM YYYY at hh:mm AM/PM", e.g. "15 Jul 2026 at 02:00 AM" — a different format than `019`'s own listing rows use for the same underlying value; see [Open Questions](#open-questions--assumptions) |
| Trip Details (right panel) | End Date & Time | read-only text | Same format as Start Date & Time |
| Trip Details (right panel) | Start Location | read-only text | Country flag icon + city name |
| Trip Details (right panel) | End Location | read-only text | Country flag icon + city name |
| Trip Details (right panel) | Created On | read-only text | Date only (no time), formatted "DD Mon YYYY", e.g. "09 Jul 2026" — again a different format than the listing's own "Created Date" (which includes a time) |

### Flow

1. Clicking a trip's name on the "My Trips" listing (`019`) navigates here, loading that specific trip's full details.
2. **The expense list is always empty in this story** — "No expenses added yet" / "No expenses have been added to this claim." renders unconditionally, since logging an expense against a trip is a future Claims/Expenses story's concern (see [Out of Scope](#out-of-scope)). This screen doesn't compute or check anything about whether expenses exist; it simply has nothing to show yet.
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
| GET | `/api/trips/:id` | — | `{ trip: { id, name, status, createdAt, startAt, endAt, startCity: { name, countryName, countryCode }, endCity: { name, countryName, countryCode }, totalAmount, approvedAmount } }` — 404 if not found or not owned by the caller |

No write endpoint in this story — nothing here changes trip data (Edit is out of scope; see below). `startCity`/`endCity` are returned as objects rather than bare ids so this screen doesn't need a second round-trip to `GET /api/cities` just to show a name — the same "one endpoint, everything it needs" posture `013`'s shared category-detail endpoint already established, scaled down to a single record.

## Data Model

No changes. Reads the same `Trip`/`City`/`Country` tables `018`/`019` already define.

## Validation Rules Summary

Not applicable.

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| TD-01 | Click a trip name on My Trips | Navigates to Trip Details for that trip |
| TD-02 | View any trip's details | Expense list shows "No expenses added yet" |
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

- **Logging expenses against a trip** — the entire left panel is a placeholder for a future Claims/Expenses story; this story only specifies its empty state.
- **The "Edit" button's actual behavior** — acknowledged as present (matching the reference screenshot) but not specified. The most plausible design, by analogy with Category Management's own Edit (`015-category-edit-and-duplicate.md`, which reuses `013`'s creation wizard pre-filled), is that Edit reopens `018`'s Create Trip form pre-filled with this trip's values — but whether that's actually correct, whether an already-non-`"new"` trip should even be editable, and what changes (if any) to `018`'s validation an edit needs, are all unanswered. Don't build Edit Trip from this doc alone.
- **Whatever "View Trip Claim" implies about Trip/Claim being the same or related entities** — this doc preserves the screenshot's own wording without resolving the underlying data-model question (see [Open Questions](#open-questions--assumptions)).
- Any action beyond viewing and navigating back (no delete, no status change, no approval action anywhere on this screen).

## Open Questions / Assumptions

- **Is "Claim" here just this screen's label for a Trip, or a genuinely separate entity a Trip owns?** The breadcrumb says "View Trip Claim," and the empty state's body copy says "No expenses have been added to this claim" (not "to this trip") — consistent internal wording that reads like intentional product terminology, not a typo. If Claim is a separate entity (e.g. one Trip has one Claim, and expenses belong to the Claim rather than directly to the Trip), that changes `020`'s own `GET /api/trips/:id` shape and probably deserves its own data-model story before Expenses gets built. Resolve before implementing the future Expenses story, not necessarily before implementing this one (this story's own scope doesn't depend on the answer, since the list is unconditionally empty either way).
- **The Edit button's destination and behavior** — flagged above; needs its own decision, ideally as an amendment to `018` (the same file that owns Create Trip's form) rather than reinvented here.
- **Two different date/time display formats for the same underlying `startAt`/`createdAt` values, across two different screens** (`019`'s listing rows vs. this page's Trip Overview) — reproduced faithfully from the reference screenshots rather than unified, since nothing indicates this was unintentional, but worth a deliberate look before implementation locks it in as two separate formatting code paths.
- **Country flag icon next to Start/End Location** — new to this story (neither `018` nor `019` mention a flag icon anywhere); requires `City`/`Country` responses to carry enough to render one (assumed: `Country.code`, an ISO alpha-2 already in the schema per `018`'s Data Model, is enough to render a flag via a standard emoji-flag-from-country-code mapping).
- **Row-click target**: this story assumes the *entire* trip name/row is clickable and navigates here, matching `019`'s own note that a details destination was an acknowledged-but-unspecified gap — confirm nothing else on the row (status badge, amount chips) should instead be its own separate click target.
