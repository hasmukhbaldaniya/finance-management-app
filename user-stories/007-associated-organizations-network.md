# 007 - Associated Organizations (Network)

**Status:** Draft
**Epic:** Associated Organizations (Network)

## Overview

Covers a **read-mostly listing** of organizations linked/invited into the current organization's network, visible only to the organization's owner, reachable from Company Settings. Each row represents one linked organization, shown via its primary contact person (name, email, phone), how it came to be linked (self-registered independently vs. invited), when it was invited, and whether the link is currently active.

**This is a different feature from — and does not replace — [003-header-navigation.md](./003-header-navigation.md)'s existing "Switch Active Organization" screen**, which already ships today at `/company-settings/organizations` (`GET /api/organizations/mine`, `PATCH /api/users/me/active-organization`). That screen lists organizations *the current user personally belongs to* (by name + GST) so they can pick which one is active — a completely different relationship from this story's *organization-to-organization* network. Because both concepts are naturally called "Associated Organizations," this story uses its own new route (`/company-settings/associated-organizations`) rather than colliding with the existing one. See [Open Questions](#open-questions--assumptions) — **this is the single biggest assumption in this document and was not confirmed live before writing it**; if "Associated Organizations" was actually meant to be an enhancement of 003's existing screen instead of a new network concept, most of this document does not apply and should be discarded in favor of a much smaller redesign of that existing screen.

Creating a new association (inviting another organization, or linking an already-existing one) is **not** built in this story — only the listing and an enable/disable toggle are. Until a future story adds that invite/create flow, this table will be empty in real usage, the same situation [004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md) are in with their Members counts before Employee Management exists.

---

## Story: View Associated Organizations

**As an** organization owner
**I want** to see every organization linked to mine, how each one joined, and whether its link is active
**So that** I can oversee my organization's network of associated organizations

### Screens & Fields

**Redesigned per approved reference screenshots — supersedes the multi-select dropdown-filter design originally drafted below.** See [Open Questions](#open-questions--assumptions) for what changed and why.

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Associated Organizations | Filter toggle (funnel icon → red X when open) | icon button, top-right of the title row | — |
| Associated Organizations | Per-column filter row (shown only while the filter toggle is open) | see table below | — |
| Associated Organizations | Associated Organizations table (columns below) | table | — |

**Table columns:**

| Column | Content | Sortable | Filter control (shown when filter row is open) |
|--------|---------|----------|------------------------------------------------|
| Organization Name | The linked organization's name (a "Pending" placeholder for rows still in "Invited" state, since no real organization exists yet — see [Data Model](#data-model)) | Yes | Text search |
| Employee Name | The primary contact person's name, with a circular initial-letter avatar | Yes | Text search |
| Email Address | The primary contact person's email | No | Text search |
| Contact No. | The primary contact person's phone number | No | Text search |
| Registration | "Registered" / "Self-Registered" / "Invited" (derived, see [Data Model](#data-model)) | No | Single-select dropdown (All / Registered / Self-Registered / Invited) |
| Invited On | Date the invite was sent; blank for "Self-Registered" rows (there was no invite) | No | — (no filter control) |
| Status | Active / Disabled, shown as a colored pill (green = Active) | No | Single-select dropdown (All / Active / Disabled) |

Only **Organization Name** and **Employee Name** are sortable — this is a deliberate reduction from the original draft's "every column sortable," matching the approved reference design exactly.

### Flow

1. On load, the screen fetches the first page of the current organization's associated-organization records (default sort: Organization Name, ascending), each row showing its contact details, derived Registrations state, invite date, and active/inactive status.
2. **Filter toggle**: the funnel icon next to the title opens a per-column filter row directly beneath the table header (visually part of the header, not a separate panel). While open, the icon becomes a red X. Clicking the X closes the row **and clears every active filter** — it's a combined close-and-reset action, not just a visibility toggle.
3. **Text filters** (Organization Name, Employee Name, Email Address, Contact No.): debounced (300ms) substring search, case-insensitive, server-side — re-queries from page 1 as the user types, the same debounce pattern used by [004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md)'s search boxes.
4. **Dropdown filters** (Registration, Status): single-select ("All" plus the field's fixed values) — a deliberate simplification from the original multi-select design (see [Open Questions](#open-questions--assumptions)). Changing either re-queries from page 1 immediately, no debounce needed since it's a discrete selection.
5. All filters combine with AND — a row must match every currently-set filter to appear.
6. **Sorting**: clicking the Organization Name or Employee Name column header toggles that column's sort direction (ascending → descending → ascending) and re-queries from page 1 with the new `sortBy`/`sortDir`. Only one column is sorted at a time. The other five columns are not interactive.
7. **Pagination**: the table loads a fixed page size (20) at a time; scrolling to the bottom of the loaded rows automatically fetches and appends the next page (true infinite scroll, no "Load more" button — matching [004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md)). This resets to page 1 whenever any filter or sort changes.
8. **Enable/disable toggle**: clicking a row's Status pill immediately calls the status-update API (no separate save step, no confirmation) and updates optimistically; on failure it reverts to its previous state and an error toast is shown. Disabling a link does not delete the record or affect the associated organization's own data — it's reversible by clicking the pill again. This screen's toggle is instant/optimistic, unlike [004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md)'s confirmation-dialog pattern — see [Open Questions](#open-questions--assumptions).
9. There is no Add, Edit, or Delete in this story — see [Out of Scope](#out-of-scope).
10. **Access control**: only a user whose `OrganizationMember.role` is `"owner"` for the current active organization can reach this screen. A non-owner attempting to load it (whether by clicking a nav link that shouldn't be visible to them, or a direct URL/API call) is rejected.

### Validation Rules

Not applicable — this story has no create/edit form. The only mutation is the Status toggle, whose only "input" is a boolean already constrained by the UI control itself.

### Acceptance Criteria

- **Given** a user whose role in the current organization is `"owner"`, **when** they open Company Settings, **then** an "Associated Organizations" link is visible and leads to this screen.
- **Given** a user whose role in the current organization is not `"owner"`, **when** they view Company Settings, **then** no "Associated Organizations" link for this screen is shown, and a direct request to its API returns 403.
- **Given** any authenticated request to this screen's API, **when** it's evaluated, **then** it only returns records belonging to the caller's own active organization, never another organization's.
- **Given** the filter row is closed, **when** the user clicks the funnel icon, **then** the per-column filter row appears and the icon becomes a red X.
- **Given** the filter row is open with one or more filters set, **when** the user clicks the X, **then** the filter row closes and every filter is cleared (the table returns to its unfiltered state).
- **Given** the table has rows matching more than one Registration/Status value, **when** the user selects a value in either dropdown filter, **then** only matching rows are shown, re-fetched from the server starting at page 1.
- **Given** the user types into any of the four text filters, **when** the debounce elapses, **then** the table shows only rows matching that filter, re-fetched from the server starting at page 1.
- **Given** the user clicks the Organization Name or Employee Name column header, **when** the request resolves, **then** the table is re-sorted by that column in the toggled direction, starting from page 1. The other five column headers are not clickable.
- **Given** more rows exist than the current loaded page(s), **when** the user scrolls to the bottom of the table, **then** the next page of results is fetched automatically and appended without losing the already-loaded rows — no button click required.
- **Given** any row, **when** the user clicks its Status pill, **then** its Active/Disabled state updates immediately without a page reload or confirmation, and reverts with an error toast if the request fails.
- **Given** a row whose Registrations value is "Self-Registered," **when** the table renders, **then** its Invite On cell is blank.
- **Given** a row whose Registrations value is "Invited," **when** the table renders, **then** its Organization Name cell shows a placeholder (e.g. "Pending") instead of a real organization name, since no organization has been created for that invite yet.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Non-owner attempts access | "You don't have permission to view this page." |
| Status toggle failed | "Something went wrong. Please try again." |
| Server/network error (load) | "Something went wrong. Please try again." |

---

## API Design

All endpoints are authenticated (session cookie via `requireAuth`) and additionally require the caller's `OrganizationMember.role` for their active organization to be `"owner"` — the first endpoint in this codebase with a role check beyond authentication. Scoped to the caller's current active organization (`User.activeOrganizationId`, from [003](./003-header-navigation.md)) as the "owning" side of the relationship — no organization id is ever accepted from the client.

| Method | Path | Body / Query | Response (success) |
|--------|------|---------------|---------------------|
| GET | `/api/associated-organizations?registrations=&status=&organizationName=&contactName=&contactEmail=&contactPhone=&sortBy=&sortDir=&page=&pageSize=` | — (query params, all optional; `registrations`/`status` still accept comma-separated values server-side for forward-compatibility, though the current UI only ever sends 0 or 1 value each per the single-select redesign; `organizationName`/`contactName`/`contactEmail`/`contactPhone` are case-insensitive substring filters; defaults: no filters, `sortBy=organizationName`, `sortDir=asc`, `page=1`, `pageSize=20`) | `{ associatedOrganizations: [{ id, organizationName, contactName, contactEmail, contactPhone, registrations, invitedAt, isActive }], hasMore: boolean }` |
| PATCH | `/api/associated-organizations/:id/status` | `{ isActive }` | `{ associatedOrganization: { id, isActive } }` |

Error responses follow the existing convention (`{ error: string }`): 401 (no session), 403 (caller isn't an owner of their active organization), 404 (`:id` doesn't belong to the caller's organization or doesn't exist), 500 (unexpected).

## Data Model

- New `AssociatedOrganization` model/table: `id`, `ownerOrganizationId` (FK → `organizations`, `onDelete: CASCADE` — the organization that owns this network view), `organizationId` (FK → `organizations`, nullable, `onDelete: SET NULL` — set once the linked organization is actually registered; null while still just an invite), `contactName`, `contactEmail`, `contactPhone`, `registrationType` (`"self_registered"` | `"invited"`, fixed at creation), `isActive` (boolean, default `true`), `invitedAt` (nullable timestamp), `createdAt`/`updatedAt`.
- **Registrations is derived, not stored as its own column**: `registrationType = "self_registered"` → shown as "Self-Registered"; `registrationType = "invited"` with `organizationId = null` → "Invited"; `registrationType = "invited"` with `organizationId` set → "Registered". This avoids two columns (`registrationType` and a separate status) getting out of sync with each other.
- No seed data and no create/update path for this table in this story — it exists purely so this listing has a real, queryable source; every organization starts with zero associated-organization rows, matching how [004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md) start with zero member assignments until their respective dependent features exist.

## Validation Rules Summary

Not applicable — no user-entered fields in this story (see [Validation Rules](#validation-rules) above).

## Test Cases

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|------------------|
| TC-01 | Owner can access the screen | Log in as a user with `role: "owner"` in the active organization, navigate to Associated Organizations | Screen loads, table renders |
| TC-02 | Non-owner cannot access the screen | Log in as a user with `role: "member"`, attempt to navigate to Associated Organizations | Nav link not shown; direct request returns 403 |
| TC-03 | Rows scoped to caller's organization only | Two organizations each have associated-organization rows; load the screen as an owner of one | Only that organization's rows are returned, never the other's |
| TC-04 | Open filter row | Click the funnel icon | Per-column filter row appears; icon becomes a red X |
| TC-05 | Close and reset filters | With one or more filters set, click the X | Filter row closes; all filters clear; table returns to unfiltered |
| TC-06 | Filter by Registration | Select "Invited" in the Registration dropdown | Only rows with Registration = "Invited" are shown |
| TC-07 | Filter by Status | Select "Disabled" in the Status dropdown | Only rows with Status = "Disabled" are shown |
| TC-08 | Text filter by Organization Name | Type a partial organization name into that column's filter | Only matching rows shown, re-fetched from page 1 |
| TC-09 | Text filter by Employee Name/Email/Contact No. | Type a partial value into each of the other three text filters | Only matching rows shown for each, re-fetched from page 1 |
| TC-10 | Combine multiple filters | Set a text filter and a dropdown filter together | Only rows matching all active filters are shown |
| TC-11 | Sort by Organization Name | Click the "Organization Name" column header | Table re-sorts alphabetically, direction toggles on repeated clicks |
| TC-12 | Sort by Employee Name | Click the "Employee Name" column header | Table re-sorts alphabetically, direction toggles on repeated clicks |
| TC-13 | Other columns are not sortable | Click the Email Address/Contact No./Registration/Invited On/Status header | Nothing happens — no sort control on those columns |
| TC-14 | Infinite pagination loads more | Scroll to the bottom of a list with more than one page | Next page fetched automatically and appended, no duplicate or missing rows, no button click required |
| TC-15 | Toggle disables a row | Click the Status pill on an active row | Pill flips to Disabled immediately, no confirmation |
| TC-16 | Toggle failure reverts | Click a row's pill while the backend request fails | Pill reverts to previous state, error toast shown |
| TC-17 | Self-registered row has no invite date | Load a row with Registration = "Self-Registered" | Invited On cell is blank |
| TC-18 | Invited row shows a pending organization name | Load a row with Registration = "Invited" | Organization Name cell shows "Pending", not a real name |
| TC-19 | Empty state | Load the screen for an organization with zero associated-organization rows | Table shows an empty state, not an error |

## Edge Cases

- **Filter + sort + pagination interplay**: changing a filter or sort always resets to page 1 — a user scrolled deep into page 3 who then changes a filter must not see stale page-3 results mixed with newly-filtered ones.
- **Organization scoping on the status-update endpoint**: `PATCH /api/associated-organizations/:id/status` must 404 (not leak a 403-with-details) if `:id` belongs to a different organization's network than the caller's, consistent with not revealing another organization's data.
- **A user who is an owner of one organization but only a member of another**: role is evaluated against the caller's *current active organization* specifically (per [003](./003-header-navigation.md)'s `activeOrganizationId`), not against any organization they've ever been an owner of — switching active organization can change whether this screen is accessible to them.
- **An "Invited" row that later becomes "Registered"**: once the invited contact completes registration (a future story, out of scope here), `organizationId` gets populated and the Organization Name cell should update from its placeholder to the real name on the next load — this story's read path already supports that transition since Registrations is derived from `organizationId`'s presence, not hardcoded.

## Out of Scope

- Creating a new associated-organization record — inviting a contact, or linking an already-existing self-registered organization into the network. No Add flow, no form, no invite-sending mechanism exists in this story; the table is populated by a future story only.
- Editing an associated-organization's contact details (name/email/phone) after creation.
- Deleting an associated-organization record — only the Status toggle (disable/enable) is available; there is no permanent removal.
- Any UI for the invited contact's side of this relationship (e.g., an "accept invite" flow, or what a "Self-Registered" organization sees about being linked) — this story is purely the owner-side viewing experience.
- Extending role-based access control to any other screen — this is the first and only screen in the app gated by `OrganizationMember.role` so far; [006](./006-roles-and-privileges-management.md)'s new `Role`/privilege system is unrelated and not wired to this check.
- Global text search across Organization Name/Employee Name/Email/Contact No. — only the two categorical column filters (Registrations, Status) were requested; a search box could be added later for consistency with [004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md) but isn't part of this story.
- Bulk actions (bulk enable/disable).
- Audit history of status changes (who disabled/re-enabled a link, and when).

## Open Questions / Assumptions

- **Resolved — "Associated Organizations" here is a new org-to-org network concept, not 003's existing switch-active-organization screen.** Confirmed live before implementation began. Built exactly as this document describes: new `AssociatedOrganization` model, new route (`/company-settings/associated-organizations`), owner-only gating. 003's existing switcher at `/company-settings/organizations` is untouched.
- **New route, not a collision with 003's existing one**: this screen lives at `/company-settings/associated-organizations`, distinct from 003's already-shipped `/company-settings/organizations`. The Company Settings sub-header entry for it is labeled **"Associated Organizations (Network)"**, not plain "Associated Organizations" — deliberately disambiguated from 003's existing sub-header entry (which keeps its original "Associated Organizations" label and still points at the org-switcher), since both would otherwise be identically-labeled links to two different pages sitting in the same sub-header. The link itself is owner-only: `GET /api/auth/me` now returns an `isOwner` boolean (derived from the same `OrganizationMember.role === "owner"` check `requireOwner` uses) so the header can hide it for non-owners without a separate request; `useSession()` exposes `isOwner` for any future owner-gated UI to reuse.
- **Filter/sort UI redesigned after initial implementation, against approved reference screenshots — supersedes several decisions this document originally made.** The first implementation followed this doc's original draft literally: two multi-select dropdown filters (Registrations, Status) sitting above the table, and all seven columns sortable. After seeing the approved visual reference, the implementation was reworked to match it instead:
  - **Single-select dropdowns, not multi-select**: Registration and Status filters are now "All" + one value at a time, not a checkbox list. The `MultiSelectFilter` component built for the original design was deleted as dead code.
  - **Four new text filters added** (Organization Name, Employee Name, Email Address, Contact No.) — not in this document's original scope (which explicitly listed "Global text search across Organization Name/Employee Name/Email/Contact No." as Out of Scope). The reference design showed per-column search boxes for these, so they were added: debounced, case-insensitive substring match, computed server-side in the same in-memory pass as the other filters.
  - **A single filter-row toggle (funnel/X icon) replaces the always-visible filter dropdowns** — filters are hidden by default and only appear when explicitly opened; closing via the X clears them.
  - **Only Organization Name and Employee Name are sortable**, down from all seven columns — matching the reference exactly. The backend still accepts any of the original seven `sortBy` values (no server-side restriction was added), only the frontend's clickable-header UI was narrowed; this is a soft restriction, not a hard API contract change, in case a future design reference restores full sortability.
  - **Status renders as a colored pill, not a `Switch`** — still clickable (same instant/optimistic toggle behavior as before), just styled differently.
  - **"Registrations"/"Invite On" column labels renamed to "Registration"/"Invited On"** to match the reference text exactly.
  
  None of this changes the underlying data model, the owner-only gating, or the instant/optimistic (non-confirmation-dialog) toggle behavior — those all remain as originally specced.
- **Owner-only gating is a new precedent**: every prior Company Settings screen ([004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md), and 003 itself) is deliberately visible to all logged-in users, with no permission system built yet. This story introduces the first real one, checking the pre-existing `OrganizationMember.role` column (not [006](./006-roles-and-privileges-management.md)'s new `Role` entity). If a fuller permission system arrives later, this check is the first thing that should be migrated onto it.
- **"Registrations" derived from two fields rather than stored directly**: chosen so "Invited" and "Registered" can never drift out of sync with whether a real linked organization exists — the alternative (a directly-stored three-value enum, manually updated when an invite completes) risks becoming stale if that future update step is ever missed.
- **Filter values are fixed enums, not free text**: Registrations and Status each have exactly 3 and 2 possible values respectively, so dropdown multi-select filters (not a search box) are the natural fit — mirrors why [006](./006-roles-and-privileges-management.md)'s privilege catalog is a fixed list rather than free text.
