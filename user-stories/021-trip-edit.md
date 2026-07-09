# 021 - Trip Edit

**Status:** Draft
**Epic:** Trip Management

## Overview

Resolves the gap `020-trip-details.md` explicitly left open: the Trip Overview panel's "Edit" button was acknowledged but not specified, since `018-trip-creation.md` scoped editing out entirely. This story answers it directly, at explicit request: **a trip can be edited only while its status is `"new"`.** Once it moves to any other status (`pending_for_approval`, `approved_for_reimbursement`, or the still-unresolved `"draft"` — see `018`'s Open Questions), editing is no longer available — the fields that made sense to change before anything downstream depended on the trip stop making sense to change once something does.

**Editing reuses `018`'s Create Trip form, pre-filled** — the same five fields (Trip Name, Start/End Date & Time, Start/End Location), the same validation rules, submitted against the same trip id instead of creating a new one. This mirrors Category Management's own precedent exactly (`015-category-edit-and-duplicate.md`'s Edit Category reuses `013`'s creation wizard rather than being a separate screen with its own rules).

---

## Story: Edit Trip

**As a** logged-in employee
**I want to** correct a trip's details while it's still new
**So that** a typo or wrong date doesn't follow the trip through its whole lifecycle

### Screens & Fields

Identical to `018`'s Create Trip screen — Trip Name, Start/End Date & Time, Start/End Location, Cancel/primary-action buttons — with two differences:

| Difference | Detail |
|------------|--------|
| Pre-filled | Every field loads from the trip's current saved state (the same `GET /api/trips/:id` `020` already defines) instead of starting blank. |
| Primary button label | "Save Changes," not "Create Trip" — this is the same screen shape reused, not a re-creation. |

### Flow

1. On Trip Details (`020`), the "Edit" button is **enabled only when the trip's status is `"new"`** — for any other status it renders disabled, with a tooltip explaining why (e.g. "Only trips with New status can be edited").
2. Clicking "Edit" (while enabled) opens the edit screen, every field pre-filled from that trip's current values.
3. Validation is identical to `018`'s Create Trip: Trip Name required (2–100 characters), Start/End Date & Time both required with End strictly after Start, Start/End Location both required (may be equal to each other).
4. **"Save Changes"** validates every field the same way `018` does, updates the trip in place (same id, same `status: "new"`, unchanged `totalAmount`/`approvedAmount`), and returns to Trip Details (`020`) showing the updated values.
5. **Cancel** discards whatever was changed and returns to Trip Details without persisting anything.
6. **If the trip's status changes away from `"new"` between opening the edit screen and clicking "Save Changes"** (e.g. a future Claims story moves it to `"pending_for_approval"` in another tab) — the save is rejected server-side, not just prevented by the now-stale disabled button the employee already got past. See [Edge Cases](#edge-cases).

### Validation Rules

Identical to `018`'s Create Trip validation rules — editing doesn't relax or add to any of them (see that story's own Validation Rules table).

| Rule | Detail |
|------|--------|
| Editable only while status is `"new"` | Enforced both by disabling the Edit button for any other status, and server-side on the update endpoint itself — not just hidden client-side, the same posture `019`'s draft-only delete already established for this epic. |

### Acceptance Criteria

- **Given** a trip with status `"new"`, **when** its Trip Details page loads, **then** the Edit button is enabled.
- **Given** a trip with any other status, **when** its Trip Details page loads, **then** the Edit button is disabled with an explanatory tooltip.
- **Given** the Edit screen is opened, **when** it loads, **then** every field is pre-filled with that trip's current values.
- **Given** valid changes, **when** "Save Changes" is clicked, **then** the trip updates in place and Trip Details reflects the new values.
- **Given** invalid input (blank Trip Name, End before Start, etc.), **when** "Save Changes" is clicked, **then** the same inline errors `018` defines block submission.
- **Given** an attempt to call the update endpoint directly on a non-`"new"` trip (bypassing the UI), **when** the request is made, **then** it's rejected server-side.
- **Given** unsaved changes on the Edit screen, **when** "Cancel" is clicked, **then** nothing is persisted and the employee returns to Trip Details.

### Error / Toast Messages

Identical to `018`'s Create Trip messages, per field (`"Trip Name is required."`, `"End Date & Time must be after the Start Date & Time."`, etc.), plus:

| Scenario | Message |
|----------|---------|
| Save succeeded | "Trip updated." |
| Attempt to edit a non-`"new"` trip | "Only trips with New status can be edited." |
| Server/network error | "Something went wrong. Please try again." |

---

## API Design

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| PATCH | `/api/trips/:id` | `{ name, startAt, endAt, startCityId, endCityId }` (same shape as `018`'s `POST /api/trips`) | `{ id, status: "new", totalAmount }` — 409 if the trip's status isn't `"new"`, 404 if not found or not owned by the caller |

`GET /api/trips/:id` (`020`'s own endpoint) needs a small addition to support pre-filling this screen: `startCity`/`endCity` must also carry `id` and `countryId` (not just `name`/`countryName`/`countryCode`), since the Edit screen's location pickers need a real, resubmittable city id, not just a display string. This is an additive change to `020`'s existing response shape — nothing that already reads it breaks.

Error responses follow the existing convention (`{ error: string }`): 400 (validation failures, identical to `018`'s), 401 (no session), 404 (trip not found or not owned by the caller), 409 (status isn't `"new"`), 500 (unexpected).

## Data Model

No changes. Updates the same `Trip` row `018` creates; doesn't touch `status`, `totalAmount`, or `approvedAmount`.

## Validation Rules Summary

Identical to `018`'s own table, plus: editable only while status is `"new"`, enforced client- and server-side.

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| TE-01 | View Trip Details for a `"new"` trip | Edit button enabled |
| TE-02 | View Trip Details for a trip in any other status | Edit button disabled, tooltip explains why |
| TE-03 | Open Edit for a `"new"` trip | Every field pre-filled with current values |
| TE-04 | Change the Trip Name and Save Changes | Trip Details shows the new name |
| TE-05 | Change End Date & Time to before Start Date & Time, Save Changes | Blocked with the same inline error `018` defines |
| TE-06 | Click Cancel after making changes | Trip unchanged, returns to Trip Details |
| TE-07 | Call `PATCH /api/trips/:id` directly on a trip with status `"pending_for_approval"` | Rejected with 409, "Only trips with New status can be edited." |
| TE-08 | Call `PATCH /api/trips/:id` for a trip belonging to a different employee | Rejected with 404 |
| TE-09 | Edit a trip, setting Start Location equal to End Location | Accepted — round trips remain valid, same as `018` |

## Edge Cases

| Scenario | Expected Result |
|----------|------------------|
| Trip's status changes away from `"new"` in another tab while the Edit screen is open in this one | Save Changes is rejected with the 409 above when submitted — the stale client-side "enabled" state from page-load doesn't get a free pass |
| Two tabs both editing the same `"new"` trip | Last write wins, the same level of rigor as every other multi-tab conflict in this codebase (`019`'s own Edge Cases has the equivalent note for delete) |

## Out of Scope

- Any status besides `"new"` ever becoming editable again later (e.g. an approver kicking a `"pending_for_approval"` trip back to editable) — not specified anywhere in this epic yet.
- Editing anything about a trip's expenses/claim — there are none yet (`020`'s own Out of Scope).
- A Save-as-Draft option on the Edit screen — same one-shot-submit shape as `018`'s own Create Trip.

## Open Questions / Assumptions

- **Exact tooltip/disabled-state copy for the Edit button** when status isn't `"new"` — assumed a single generic explanation regardless of which non-`"new"` status the trip is actually in; a status-specific message (e.g. different wording for Draft vs. Pending for Approval) wasn't requested and isn't assumed here.
- **Whether "Save Changes" should warn about unsaved changes on Cancel/navigate-away** — not specified; assumed no warning, matching `018`'s own Create Trip Cancel behavior (discards silently).
