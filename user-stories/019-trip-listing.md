# 019 - Trip Listing

**Status:** Draft
**Epic:** Trip Management

## Overview

Covers "My Trips" — the screen an employee lands on to see every trip they've created, reached from the same `Trips` nav item `018-trip-creation.md`'s Create Trip screen is reached from. Where `018` covers creating a trip and confirming a bare-minimum "it showed up," this story covers the real listing: per-trip identity (name + reference number), both of its dates, a richer status set than `018` anticipated, amount figures formatted as Indian Rupees, search, three filters, and infinite-scroll pagination — the same "creation now, full listing later" split this codebase already used for Category Management (`013` creation vs. `014` listing).

**This story surfaces a real gap in `018` that needs resolving, not silently patching over**: the reference screenshot's sample data shows trips in a `"Draft"` status *with* a delete affordance, distinct from `"New"` (no delete affordance). `018` explicitly assumed Create Trip has **no draft-saving path** ("a single-screen, single-submit form... an abandoned Create Trip screen leaves no trace") and that every created trip starts as `"new"` — so where would a `"Draft"` trip come from? Either `018` is missing a Save-as-Draft action it should have had, or `"Draft"`/`"New"` are meant to be the same state under two names, or the sample data in the reference screenshot predates/doesn't reflect this app's own implementation. **This needs an explicit answer before `018` is implemented** — flagged again in [Open Questions](#open-questions--assumptions), and `018` itself has been annotated with a pointer to this section.

**Currency is Indian Rupees, confirmed by the reference screenshot** — resolving `018`'s own "multi-currency is out of scope, no formatting question arises yet" note. It doesn't arise because there's exactly one currency: every amount renders with a `₹` glyph (inside a small rounded icon chip, not just a text prefix) and Indian digit grouping (`₹1,50,000.00`, not `₹150,000.00`).

---

## Story: My Trips — List, Search, and Filter

**As a** logged-in employee
**I want to** see all my trips with their status and amounts, and narrow the list down
**So that** I can find a specific trip without scrolling through everything

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| My Trips | Page title "My Trips" | heading | Replaces `018`'s placeholder listing note |
| My Trips | Search | text input, top-right | Debounced; see [Open Questions](#open-questions--assumptions) for exactly which fields it matches |
| My Trips | "Create Claim" button | button, top-right, secondary styling | A sibling entry point next to Create Trip — **Create Claim itself is a separate, not-yet-written story**; this story only accounts for the button's presence on this screen, not what it does |
| My Trips | "Create Trip" button | button, top-right, primary styling | → `018`'s Create Trip screen |
| My Trips (left filter rail) | Trip Start Date | date picker | Filters to trips whose `startAt` matches |
| My Trips (left filter rail) | Created Date | date picker | Filters to trips whose `createdAt` matches |
| My Trips (left filter rail) | Status | single-select dropdown | Options: All, Draft, New, Pending for Approval, Approved for Reimbursement (see [Status Values](#status-values--display) below) |
| My Trips | Trip row (repeated) | card | See fields below |

**Each trip row shows**:

| Field | Notes |
|-------|-------|
| Trip Name (#Reference Number) | e.g. "Happy test cases (#80)" — the name is whatever the employee typed in `018`'s Trip Name field; `#80` is the trip's own reference number (see [Open Questions](#open-questions--assumptions) on whether that's the raw database id or a friendlier sequential number) |
| Status badge | top-right of the row — see [Status Values](#status-values--display) |
| Delete icon | shown only on `"Draft"`-status rows, next to the status badge — mirrors `014-category-listing.md`'s "Delete icon only for draft" rule exactly |
| Created Date | with a calendar icon, e.g. "Jul 9, 2026, 12:25 PM" |
| Trip Start Date | with a calendar icon, e.g. "Jul 15, 2026, 2:00 AM" |
| Total Amount | a ₹-icon chip + "Total Amount" label + bold ₹ value, e.g. "₹0.00" or "₹51,568.00" |
| Approved Amount | a second ₹-icon chip, shown **only** when status is `"Approved for Reimbursement"`, alongside Total Amount |

### Status Values & Display

| Status | Badge style | Icon | Delete icon shown? |
|--------|-------------|------|---------------------|
| `Draft` | muted/grey pill | info (ⓘ) | Yes |
| `New` | muted/grey pill | info (ⓘ) | No |
| `Pending for Approval` | amber/orange pill | star | No |
| `Approved for Reimbursement` | green pill | person-check | No |

Visually, `Draft` and `New` render identically apart from their label and the delete icon — the delete icon is what actually distinguishes a deletable row, not badge color.

### Flow

1. The list loads the first page of the logged-in employee's own trips, most-recently-created first (no other default sort is specified).
2. **Search** narrows the list as the employee types (debounced, no full page reload) — see [Open Questions](#open-questions--assumptions) for exactly which fields it matches, since neither the request nor the reference screenshot pins this down precisely.
3. **Filters** (Trip Start Date, Created Date, Status) apply together (`AND`, not `OR`) — e.g. picking both a Trip Start Date and a Status narrows to trips matching both. Clearing a filter's date/selection removes that filter's effect without resetting the others.
4. **Pagination is infinite-scroll**, matching every other paginated listing in this codebase (Grade/Department/Roles/Employee/Category Listing's `useInfiniteScroll` hook, per `frontend/CLAUDE.md`) — a sentinel element near the bottom of the list triggers loading the next page, with a spinner shown while that request is in flight.
5. Clicking a trip's name navigates to `020-trip-details.md`'s read-only Trip Details page for that trip — the same "creation/listing now, details page later" split `013`/`014` had before `016` filled it for Category Management.
6. An employee with zero trips sees an empty state directing them to "+ Create Trip" — matching `014-category-listing.md`'s own empty-state precedent.

### Validation Rules

Not applicable — this story has no form fields beyond filter/search inputs, which narrow a list rather than validate submitted data.

### Acceptance Criteria

- **Given** a trip list with mixed statuses, **when** the page renders, **then** each row shows the correct badge style/icon per [Status Values](#status-values--display), and only `Draft` rows show a delete icon.
- **Given** a trip with status `Approved for Reimbursement`, **when** its row renders, **then** both Total Amount and Approved Amount chips are shown; every other status shows Total Amount only.
- **Given** more trips exist than fit on one page, **when** the employee scrolls near the bottom, **then** the next page loads automatically with a loading indicator, appended to the existing rows.
- **Given** a Status filter of "Draft" is selected, **when** the list reloads, **then** only Draft trips are shown.
- **Given** both a Trip Start Date filter and a Status filter are set, **when** the list reloads, **then** only trips matching both narrow the results (`AND`).
- **Given** zero trips exist for the logged-in employee, **when** the page loads, **then** an empty state with a "+ Create Trip" call-to-action shows instead of a blank list.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Failed to load the Trips list | "Something went wrong. Please try again." |

---

## Story: Delete a Draft Trip

**As a** logged-in employee
**I want to** delete a trip I'm still setting up
**So that** I can discard one I started by mistake, before it's ever really used

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| My Trips | Delete icon (per Draft row) | button → opens confirmation dialog | Not rendered for any other status, mirroring `014`'s Delete Category dialog exactly |
| Delete Trip dialog | Title "Delete Trip?" | — | — |
| Delete Trip dialog | Body: `Are you sure you want to delete "{Trip Name}"? This action cannot be undone.` | — | — |
| Delete Trip dialog | "No" / "Yes, Delete" buttons | — | destructive styling on "Yes, Delete" |

### Flow

1. Clicking a Draft trip's delete icon opens the confirmation dialog above, naming that specific trip.
2. "No" closes the dialog with no effect.
3. "Yes, Delete" **soft-deletes** the trip (a `deletedAt` timestamp is set, the row itself isn't physically removed) and it disappears from the list — from the employee's own perspective this looks identical to a hard delete: the row is simply gone and can't be reopened. Every listing/detail query already excludes a soft-deleted trip automatically, so nothing about "which trips show up" needed any special-casing for this.
4. Deleting is only ever possible while status is `"Draft"` — enforced server-side on the delete endpoint itself, not just by hiding the icon client-side (same posture as Category's own draft-only delete rule). Since no code path in this app currently produces a `"Draft"`-status trip, this delete action isn't reachable through the current UI either — see this story's own Overview for that still-unresolved gap.

### Validation Rules

| Rule | Detail |
|------|--------|
| Deletable only while status is `Draft` | Enforced both by not rendering the delete icon for any other status, and server-side on the delete endpoint. |

### Acceptance Criteria

- **Given** a Draft trip, **when** its delete icon is clicked, **then** the confirmation dialog opens naming that trip.
- **Given** the dialog is open, **when** "No" is clicked, **then** it closes and the trip is untouched.
- **Given** the dialog is open, **when** "Yes, Delete" is clicked, **then** the trip is soft-deleted (not physically removed — see Data Model) and disappears from the list.
- **Given** an attempt to call the delete endpoint directly on a non-Draft trip (bypassing the UI), **when** the request is made, **then** it's rejected server-side.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Delete succeeded | "Trip deleted." |
| Attempt to delete a non-Draft trip | "Only draft trips can be deleted." |
| Server/network error | "Something went wrong. Please try again." |

---

## API Design

| Method | Path | Body / Query | Response (success) |
|--------|------|---------------|---------------------|
| GET | `/api/trips` | `search`, `tripStartDate`, `createdDate`, `status`, `page`, `pageSize` (all optional; defaults `page=1`, a `pageSize` matching this codebase's other infinite-scroll listings) | `{ trips: [{ id, name, status, createdAt, startAt, endAt, totalAmount, approvedAmount }], hasMore }` — only the caller's own trips |
| DELETE | `/api/trips/:id` | — | `{ message }` — 400/409 if the trip isn't `"Draft"` |

Error responses follow the existing convention (`{ error: string }`): 400 (wrong lifecycle state for delete), 401 (no session), 404 (trip not found or not owned by the caller), 500 (unexpected).

## Data Model

No new tables. **Extends `Trip` (defined in `018-trip-creation.md`)** with:

- `approvedAmount` (decimal, nullable) — populated by a future Claims/Approval story, not by anything in `018` or this story; `null`/unset for any trip that has never reached `Approved for Reimbursement`.
- `deletedAt` (timestamp, nullable) — added alongside Claim Management so `deleteTrip` above soft-deletes instead of physically removing the row (`Trip` is `paranoid: true`). Every existing query against `Trip` already excludes a row with `deletedAt` set, with no changes needed anywhere else in this story.

**`"pending_for_approval"` is no longer out of scope — Claim Management (`022`–`027`) is what produces it.** Linking a claim to a trip and saving at least one expense against it flips that trip's `status` from `"new"` to `"pending_for_approval"` automatically (a one-way transition; see `022`'s own doc for `recomputeTripFromLinkedClaims`), and `Trip.totalAmount` stops being a fixed `0.00` and becomes a live sum of every claim linked to that trip. This story's own listing/filter behavior needed no changes for either — both were already treated as live database values here, just previously always `0`/`"new"` in practice since nothing produced anything else yet. `"approved_for_reimbursement"` (an approver acting on a submitted claim) is still out of scope for both this story and `018`. Whether `"draft"` is a real, reachable Trip state still requires resolving `018`'s Save-as-Draft gap first (see [Overview](#overview)) — unrelated to the `pending_for_approval` transition above.

## Validation Rules Summary

| Field | Rule |
|-------|------|
| Delete action | Available only while status is `Draft`, enforced client- and server-side. |

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| TL-01 | Load the listing with trips in every status | Each renders the correct badge/icon per Status Values; only Draft shows a delete icon |
| TL-02 | Scroll to the bottom of a multi-page list | Next page loads automatically, appended below existing rows |
| TL-03 | Load the listing with zero trips | Empty state with "+ Create Trip" shown |
| TL-04 | Filter by Status = "Approved for Reimbursement" | Only trips in that status show, each with both Total and Approved Amount chips |
| TL-05 | Filter by Trip Start Date and Status together | Only trips matching both narrow the results |
| TL-06 | Type into Search | List narrows without a full page reload |
| TL-07 | Delete a Draft trip, confirm | Trip removed from the list and database |
| TL-08 | Delete a Draft trip, decline | Trip unchanged, dialog closes |
| TL-09 | Attempt `DELETE /api/trips/:id` on a non-Draft trip directly | Rejected with a 400/409 error |
| TL-10 | View a trip with status "New" or "Draft" | Only Total Amount chip shown (₹0.00), no Approved Amount chip |
| TL-11 | View an amount ≥ ₹100,000 | Rendered with Indian digit grouping, e.g. "₹1,50,000.00", not "₹150,000.00" |

## Edge Cases

| Scenario | Expected Result |
|----------|------------------|
| Two employees each have a trip; employee A applies a filter | Only employee A's own trips are ever candidates — filters narrow within the caller's own trips, never across employees (same isolation `018` already establishes) |
| A Draft trip is deleted by the employee in one tab while viewing it in another | The second tab's next action against that trip's id gets a 404 — no special recovery/merge behavior, same posture as every other multi-tab conflict in this codebase |
| Pagination request for a page beyond the last one | Returns an empty `trips` array with `hasMore: false`, not an error |
| `approvedAmount` requested for a trip that never reached Approved for Reimbursement | `null`, and the UI simply doesn't render an Approved Amount chip for it |

## Out of Scope

- **Resolving `018`'s Draft-state gap** — this story documents `Draft` as an observed status for display purposes only; it does not add a Save-as-Draft action to Create Trip, which is what would actually be needed to produce a Draft trip. That's `018`'s own concern to amend.
- **Everything that produces `Pending for Approval` or `Approved for Reimbursement`** — submitting a claim against a trip, an approver's review/decision — a future Claims/Approval epic's concern entirely.
- **Create Claim** — the button's presence on this screen is in scope; what it does is not.
- **The Trip Details page's own full content** (Trip Overview panel, expense list, Edit button) — `020-trip-details.md`'s concern entirely; this story only establishes that clicking a trip's name navigates there.
- **Editing a trip** — no edit action exists anywhere in this story or `018`.
- Bulk actions (multi-select delete across several trips at once).
- Sorting controls beyond the default most-recently-created order — not specified in the source request.

## Open Questions / Assumptions

- **`018`'s "no draft state" assumption appears to conflict with this screenshot's sample data.** This is the single most important open question across both stories — resolve before implementing either. Two plausible fixes: (a) add a Save-as-Draft action to `018`'s Create Trip screen, the same way Category Creation has one, making `"draft"` a real reachable state; or (b) treat the reference screenshot's sample data as not-yet-aligned with this app's own design and collapse `"Draft"`/`"New"` into one status. Don't implement either story until this is answered.
- **What exactly does Search match?** Assumed Trip Name and/or the `#`-reference number shown on each row, by analogy with every other free-text search in this codebase (Employee Listing's Name field folds in Employee Code the same way), but neither the request nor the screenshot confirms this precisely.
- **Are the date filters exact-date matches or date ranges?** The reference screenshot shows a single "Select Date" control per filter (Trip Start Date, Created Date), which reads as a single exact date, but a listing filter that only matches one exact calendar day (rather than a range) is an unusual, narrow design for this kind of screen — confirm which was actually intended before implementation.
- **Is the `(#N)` reference number the trip's raw database id, or a friendlier sequential "Trip Number"** (the way Employee Code is a separate field from Employee's own id)? Assumed raw id for simplicity; flag if a dedicated, possibly org-scoped sequential number is actually wanted.
- **Does "Create Claim" need to know which trip it's claiming against when clicked from this global (not per-row) position on the page**, or does it open a claim flow that asks the employee to pick a trip afterward? Not answerable until Create Claim itself is specified.
