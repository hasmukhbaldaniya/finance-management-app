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

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Associated Organizations | Registrations filter (Registered / Self-Registered / Invited, multi-select) | dropdown filter | — |
| Associated Organizations | Status filter (Active / Disabled, multi-select) | dropdown filter | — |
| Associated Organizations | Associated Organizations table (columns below) | table | — |

**Table columns:**

| Column | Content | Sortable | Filterable |
|--------|---------|----------|------------|
| Organization Name | The linked organization's name (blank/placeholder for rows still in "Invited" state, since no real organization exists yet — see [Data Model](#data-model)) | Yes | — |
| Employee Name | The primary contact person's name | Yes | — |
| Email Address | The primary contact person's email | Yes | — |
| Contact No. | The primary contact person's phone number | Yes | — |
| Registrations | "Registered" / "Self-Registered" / "Invited" (derived, see [Data Model](#data-model)) | Yes | Yes (multi-select) |
| Invite On | Date the invite was sent; blank for "Self-Registered" rows (there was no invite) | Yes | — |
| Status | Active / Disabled, shown via a toggle Switch | Yes | Yes (multi-select) |

### Flow

1. On load, the screen fetches the first page of the current organization's associated-organization records (default sort: Organization Name, ascending), each row showing its contact details, derived Registrations state, invite date, and active/inactive status.
2. **Filters**: selecting one or more Registrations values and/or one or more Status values re-queries the list restricted to those values (server-side, not a client-side filter of already-loaded rows — see Pagination). Filters combine with AND between the two filter groups and OR within each group's selected values. Changing either filter resets the loaded set back to page 1.
3. **Sorting**: clicking any column header toggles that column's sort direction (ascending → descending → ascending) and re-queries from page 1 with the new `sortBy`/`sortDir`. Only one column is sorted at a time.
4. **Pagination**: the table loads a fixed page size (20) at a time; scrolling to the bottom of the loaded rows (or clicking a "Load more" control) fetches and appends the next page. This resets to page 1 whenever a filter or sort changes.
5. **Enable/disable toggle**: flipping a row's Status Switch immediately calls the status-update API (no separate save step, no confirmation) and updates optimistically; on failure the switch reverts to its previous state and an error toast is shown. Disabling a link does not delete the record or affect the associated organization's own data — it's reversible by flipping the toggle back.
6. There is no Add, Edit, or Delete in this story — see [Out of Scope](#out-of-scope).
7. **Access control**: only a user whose `OrganizationMember.role` is `"owner"` for the current active organization can reach this screen. A non-owner attempting to load it (whether by clicking a nav link that shouldn't be visible to them, or a direct URL/API call) is rejected.

### Validation Rules

Not applicable — this story has no create/edit form. The only mutation is the Status toggle, whose only "input" is a boolean already constrained by the UI control itself.

### Acceptance Criteria

- **Given** a user whose role in the current organization is `"owner"`, **when** they open Company Settings, **then** an "Associated Organizations" link is visible and leads to this screen.
- **Given** a user whose role in the current organization is not `"owner"`, **when** they view Company Settings, **then** no "Associated Organizations" link for this screen is shown, and a direct request to its API returns 403.
- **Given** any authenticated request to this screen's API, **when** it's evaluated, **then** it only returns records belonging to the caller's own active organization, never another organization's.
- **Given** the table has rows in more than one Registrations/Status combination, **when** the user selects filter values, **then** only matching rows are shown, re-fetched from the server starting at page 1.
- **Given** the user clicks any column header, **when** the request resolves, **then** the table is re-sorted by that column in the toggled direction, starting from page 1.
- **Given** more rows exist than the current loaded page(s), **when** the user scrolls to the bottom (or clicks "Load more"), **then** the next page of results is fetched and appended without losing the already-loaded rows.
- **Given** any row, **when** the user flips its Status toggle, **then** its Active/Disabled state updates immediately without a page reload, and reverts with an error toast if the request fails.
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
| GET | `/api/associated-organizations?registrations=&status=&sortBy=&sortDir=&page=&pageSize=` | — (query params, all optional; `registrations`/`status` accept comma-separated multi-select values; defaults: no filters, `sortBy=organizationName`, `sortDir=asc`, `page=1`, `pageSize=20`) | `{ associatedOrganizations: [{ id, organizationName, contactName, contactEmail, contactPhone, registrations, invitedAt, isActive }], hasMore: boolean }` |
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
| TC-04 | Filter by Registrations | Select "Invited" in the Registrations filter | Only rows with Registrations = "Invited" are shown |
| TC-05 | Filter by Status | Select "Disabled" in the Status filter | Only rows with Status = "Disabled" are shown |
| TC-06 | Combine both filters | Select "Registered" + "Active" | Only rows matching both are shown |
| TC-07 | Sort by Organization Name | Click the "Organization Name" column header | Table re-sorts alphabetically, direction toggles on repeated clicks |
| TC-08 | Sort by Invite On | Click the "Invite On" column header | Table re-sorts by date, direction toggles on repeated clicks |
| TC-09 | Infinite pagination loads more | Scroll to the bottom of a list with more than one page | Next page fetched and appended, no duplicate or missing rows |
| TC-10 | Toggle disables a row | Click the Status toggle on an active row | Switch flips off immediately; row shows Disabled |
| TC-11 | Toggle failure reverts | Flip a row's toggle while the backend request fails | Switch reverts to previous state, error toast shown |
| TC-12 | Self-registered row has no invite date | Load a row with Registrations = "Self-Registered" | Invite On cell is blank |
| TC-13 | Invited row shows a pending organization name | Load a row with Registrations = "Invited" | Organization Name cell shows a placeholder, not a real name |
| TC-14 | Empty state | Load the screen for an organization with zero associated-organization rows | Table shows an empty state, not an error |

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

- **Biggest assumption — "Associated Organizations" here is a new org-to-org network concept, not 003's existing switch-active-organization screen.** I asked three clarifying questions before writing this document (what "associated organizations" means, whether owner-only gating should be introduced, and the precise meaning of the three Registrations states) and got no response in time to confirm before proceeding, per the interactive tool's own fallback guidance to use best judgment and flag it. The columns requested (Employee Name, Email, Contact No., Registrations, Invite On) don't describe 003's existing screen (which only ever showed Organization Name + GST + a Switch button) — they describe a different relationship entirely. If this assumption is wrong and the actual intent was "redesign 003's existing switcher with better columns and a real data table," this entire document should be discarded in favor of a much smaller story that modifies `company-settings/organizations/page.tsx` in place rather than adding a new route, model, and API surface.
- **New route, not a collision with 003's existing one**: this screen lives at `/company-settings/associated-organizations`, distinct from 003's already-shipped `/company-settings/organizations`. The Company Settings sub-header needs a new entry for it (owner-only visibility, per [Access control](#flow) above) — this is left for implementation time, not decided further here.
- **Owner-only gating is a new precedent**: every prior Company Settings screen ([004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md), and 003 itself) is deliberately visible to all logged-in users, with no permission system built yet. This story introduces the first real one, checking the pre-existing `OrganizationMember.role` column (not [006](./006-roles-and-privileges-management.md)'s new `Role` entity). If a fuller permission system arrives later, this check is the first thing that should be migrated onto it.
- **"Registrations" derived from two fields rather than stored directly**: chosen so "Invited" and "Registered" can never drift out of sync with whether a real linked organization exists — the alternative (a directly-stored three-value enum, manually updated when an invite completes) risks becoming stale if that future update step is ever missed.
- **Filter values are fixed enums, not free text**: Registrations and Status each have exactly 3 and 2 possible values respectively, so dropdown multi-select filters (not a search box) are the natural fit — mirrors why [006](./006-roles-and-privileges-management.md)'s privilege catalog is a fixed list rather than free text.
