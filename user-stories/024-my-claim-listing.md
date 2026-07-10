# 024 - My Claim Listing

**Status:** Draft
**Epic:** Claim Management

## Overview

Covers the "My Claim" screen both claim-creation flows (`022` manual, `023` AI-powered) land on — the same "creation now, listing separately" split this epic's own docs already establish, mirroring `014-category-listing.md` and `019-trip-listing.md` exactly. Also covers the **"Split Request"** tab shown alongside "My Claim" in the reference screenshot, which your own answer resolved as a queue of claims produced by `022`'s Split Claim action (not a separate action of its own).

---

## Story: My Claim — List, Search, and Filter

**As a** logged-in employee
**I want to** see all my claims with their status and amount
**So that** I can find a specific one and know what still needs attention

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| My Claim | Tabs: "My Claim" / "Split Request" | tabs | See the second story below |
| My Claim | Search | text input, top-right | Matches Claim Name and the `(#N)` reference number, same posture as `019`'s own Trip search |
| My Claim | "Create Claim" button | button → `022`'s entry screen | — |
| My Claim (left filter rail) | Created Date | date picker | Exact-calendar-day match, same resolution `019` already made for Trips |
| My Claim (left filter rail) | Status | single-select dropdown | Options: All, Draft, plus whatever statuses the future Approval story introduces (this story only ever produces Draft or one generic submitted value — see `022`'s Overview) |
| My Claim | Claim row (repeated) | card | See fields below |

**Each claim row shows**:

| Field | Notes |
|-------|-------|
| Claim Name (#Reference Number) | For a trip-linked claim, see `022`'s own Open Question on what stands in for a name |
| Status badge | Draft (delete icon shown alongside), or whatever submitted-state badge a future story introduces |
| Submission Date | With a calendar icon — note this is a different label than Trip Listing's "Created Date" column, reproduced as shown in the reference screenshot rather than unified |
| Total Amount | ₹-icon chip, Indian digit grouping, same as `019`'s own Trip amount chips |

### Flow

1. Loads the employee's own claims, most-recently-created first, infinite-scroll paginated — same `useInfiniteScroll` pattern as every other listing in this codebase.
2. **Delete** is available only on Draft claims (icon shown only on those rows), with the same confirmation-dialog posture `019`'s own Delete Draft Trip story established — enforced server-side too, not just hidden client-side.
3. Clicking a claim row is expected to open some kind of Claim Details view, the same gap `019` had before `020` filled it for Trips — **not specified in this story**, flagged in [Out of Scope](#out-of-scope).

### Validation Rules

| Rule | Detail |
|------|--------|
| Delete action | Available only while status is Draft, enforced client- and server-side |

### Acceptance Criteria

- **Given** claims in both Draft and submitted states, **when** the list renders, **then** only Draft rows show a delete icon.
- **Given** a Draft claim, **when** its delete icon is clicked and confirmed, **then** it's removed from the list and database.
- **Given** a Status filter of "Draft," **when** applied, **then** only Draft claims show.
- **Given** zero claims exist, **when** the page loads, **then** an empty state with a "Create Claim" call-to-action shows.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Failed to load the list | "Something went wrong. Please try again." |
| Delete succeeded | "Claim deleted." |
| Attempt to delete a non-Draft claim | "Only draft claims can be deleted." |

---

## Story: Split Request Queue

**As a** logged-in employee
**I want to** see claims that came from splitting another claim, separately from my main list
**So that** I can tell which claims are follow-ons from a split, not new work I started myself

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| Split Request (tab) | Same row shape as "My Claim" | card | Filtered to only claims created via `022`'s Split Claim action |

### Flow

1. Shows every claim in this employee's own list that has a non-null "split from" origin (i.e. was produced by `022`'s Split Claim action), using the exact same row/filter/search shape as "My Claim" itself.
2. This is a **view, not a separate action** — per your own answer, there's no distinct "request a split" workflow here; it's just a filtered lens on claims that already exist.
3. A claim appears in this tab only, not duplicated into "My Claim" too — mirroring how a tab-based filter normally partitions rather than duplicates a list (confirm if you actually want it to appear in both).

### Validation Rules

Not applicable — same rules as the main list, just pre-filtered.

### Acceptance Criteria

- **Given** a claim produced via Split Claim, **when** the Split Request tab is opened, **then** it appears there.
- **Given** that same claim, **when** the main "My Claim" tab is viewed, **then** it does not also appear there (see Flow point 3 on confirming this).

### Error / Toast Messages

Same as the main list.

---

## API Design

| Method | Path | Query | Response (success) |
|--------|------|-------|---------------------|
| GET | `/api/claims` | `search`, `createdDate`, `status`, `splitOrigin` (boolean — powers the Split Request tab as a filter, not a separate endpoint), `page`, `pageSize` | `{ claims: [...], hasMore }` |
| DELETE | `/api/claims/:id` | — | `{ message }` — 409 if not Draft |

## Data Model

No new tables — reads/deletes the `Claim`/`Expense` tables `022`/`023` define. The Split Request tab's filter relies on `Expense.splitFromExpenseId`/an equivalent claim-level "split origin" marker set when `022`'s Split Claim action creates the new claim (see that story's own Data Model — this doc doesn't add a new column, just reads the one `022` already needs for its own "which expenses came from where" bookkeeping).

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| ML-01 | Load the listing with claims in Draft and submitted states | Only Draft rows show a delete icon |
| ML-02 | Filter by Status = Draft | Only Draft claims show |
| ML-03 | Search by claim name or `#id` | Narrows correctly |
| ML-04 | Delete a Draft claim, confirm | Removed |
| ML-05 | Attempt `DELETE /api/claims/:id` on a submitted claim | Rejected, 409 |
| ML-06 | Open the Split Request tab | Shows only claims produced by Split Claim |

## Out of Scope

- A Claim Details page (clicking a row) — not specified here, a future story's concern, the same gap `019` had before `020`.
- Any action within the Split Request tab beyond viewing (no "request a split" initiation flow, since there isn't one per your own answer).

## Open Questions / Assumptions

- **Does a claim appear in both "My Claim" and "Split Request," or only the latter, once it's split-originated?** Assumed only the latter (a true filter/partition); confirm if both is actually wanted.
- **A Claim Details page** is acknowledged as a likely near-future need (mirroring `020`'s own precedent for Trips) but isn't specified here — flagging so it isn't silently forgotten the way Trip Details briefly was before `020` existed.
