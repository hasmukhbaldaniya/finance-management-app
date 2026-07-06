# 005 - Department Management

**Status:** Draft
**Epic:** Department Management

## Overview

Covers full CRUD for **Departments** — the organizational units (e.g. "Engineering", "Finance") an organization defines for its members — reachable from Company Settings → Departments. This replaces the placeholder page created in [003-header-navigation.md](./003-header-navigation.md) (`/company-settings/departments`, currently `<ComingSoon title="Departments" />`) with the real screen; no new route is introduced. Departments are scoped per-organization (the current active organization, per [003](./003-header-navigation.md)'s `activeOrganizationId`), have exactly one editable field (name) plus an active/inactive status, and can be viewed alongside the count of organization members currently assigned to each one. This story is a structural twin of [004-grade-management.md](./004-grade-management.md) — same CRUD shape, same table/dialog/toggle behavior, same pagination/search/sort design — with "Grade" replaced by "Department" throughout; every resolved decision and Open Question in that story applies here identically unless called out otherwise below. Assigning a department *to* a member is not built here — that belongs to the not-yet-built Employee Management screen (see [Out of Scope](#out-of-scope)); this story only displays and manages the departments themselves.

---

## Story: Manage Departments

**As a** logged-in user
**I want** to create, edit, enable/disable, and delete my organization's departments, and see who's assigned to each
**So that** I can define and maintain the organizational units my organization uses

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Department Management | Search | text (global search by department name) | — |
| Department Management | "New Department" button | button → opens Add Department dialog | — |
| Department Management | Departments table (Department, Members, Actions columns — see below) | table | — |
| Add/Edit Department dialog | Department Name | text | Yes |
| Add/Edit Department dialog | Save button | button | — |
| Add/Edit Department dialog | Cancel / close | link/button → closes dialog, discards changes | — |
| Edit Department dialog only | Delete button | button → opens delete-confirmation, disabled when the department has ≥1 assigned member | — |
| Members dialog (opened by clicking a department's Members count) | Member list (name + email) | read-only list | — |
| Members dialog | Close | button → closes dialog | — |
| Status confirmation dialog (opened by flipping the Actions-column Switch) | "Enable/Disable this department?" with Cancel / Enable/Disable | dialog | — |

**Table columns:**

| Column | Content | Sortable |
|--------|---------|----------|
| Departments | Department name | Yes |
| Members | Count of organization members currently assigned this department; clicking it opens the Members dialog for that department | Yes (by count) |
| Actions | Edit icon (opens Edit Department dialog) + a Switch toggle for active/inactive | No |

### Flow

1. On load, the screen fetches the first page of the current organization's departments (default sort: Department name, ascending), each row showing its name, member count, current active/inactive state, and an Edit action.
2. **Search**: typing in the search box (debounced) re-queries the list filtered by department name (server-side substring match, case-insensitive) — it does not just filter whatever rows are already loaded, since not all rows are loaded at once (see Pagination below). Changing the search term resets the loaded set back to page 1.
3. **Sorting**: clicking the Departments or Members column header toggles that column's sort direction (ascending → descending → ascending) and re-queries from page 1 with the new `sortBy`/`sortDir`. Only one column is sorted at a time.
4. **Pagination**: the table loads a fixed page size (20) at a time; scrolling to the bottom of the loaded rows automatically fetches and appends the next page (true infinite scroll — there is no "Load more" button). A small loading indicator appears at the bottom while the next page is being fetched. This resets to page 1 whenever search or sort changes.
5. **Add**: clicking "New Department" opens a dialog with an empty Department Name field. Client-side validation runs on submit (required, length). On submit, the frontend calls the create API.
   - **Success** → new department appears in the table (member count 0, active by default); dialog closes; success toast shown.
   - **Duplicate name** (case-insensitive, within this organization) → backend rejects with 409; frontend shows it as an inline field error on Department Name; dialog stays open.
   - **Unexpected server error** → generic error toast; dialog stays open with the entered value intact.
6. **Edit**: clicking a row's Edit icon opens the same dialog pre-filled with that department's current name, plus a Delete button. Submitting Save behaves the same as Add (validation, duplicate-name handling) but calls the update API instead, keyed to that department's id.
7. **Delete** (from within the Edit dialog only — there is no delete action directly in the table row): clicking Delete shows a confirmation step. If the department currently has zero assigned members, confirming calls the delete API and removes the row on success. If the department has one or more assigned members, the Delete button is disabled with an inline explanation ("This department has N member(s) assigned. Disable it instead, or reassign those members first.") — reassignment itself isn't available yet since Employee Management doesn't exist (see [Out of Scope](#out-of-scope)).
8. **Enable/disable toggle**: flipping the Actions column's Switch does **not** change status immediately — it opens a confirmation dialog ("Enable this department?" / "Disable this department?", with Cancel and a confirm button labeled Enable/Disable), matching [004](./004-grade-management.md)'s Grade toggle (see that doc's Open Questions for why this superseded an originally-specced instant/optimistic toggle). The Switch's visual state doesn't move until the dialog is confirmed; Cancel or a failed request leaves it exactly as it was. Confirming calls the status-update API; on success the Switch updates and the dialog closes with a success toast ("Department enabled."/"Department disabled."); on failure the dialog stays open with an error toast. Disabling a department does **not** affect members already assigned to it — it only means the department shouldn't be offered when assigning a *new* department to a member in the future (not enforced by this story, since that assignment UI doesn't exist yet).
9. **Viewing members**: clicking a department's Members count (when > 0) opens a read-only dialog listing every organization member currently assigned that department (name + email). Clicking a Members count of 0 does nothing (no dialog, since there's nothing to show).

### Validation Rules

| Field | Rule |
|-------|------|
| Department Name | Required. Trimmed length 2–50 characters. Must be unique within the current organization, case-insensitive (checked server-side on create/edit; no live-check-on-blur, unlike GST in [002](./002-organization-signup.md) — this is an internal admin field, not worth the extra round-trip). |

### Acceptance Criteria

- **Given** a valid, unused (within this org) Department Name, **when** the user submits Add or Edit, **then** the department is created/updated, the dialog closes, and the table reflects the change.
- **Given** a Department Name that's empty or outside the 2–50 character range, **when** the user attempts to submit, **then** the dialog is blocked client-side with an inline "required"/"length" error and no API call is made.
- **Given** a Department Name that already exists in this organization (case-insensitive), **when** the user submits, **then** the backend rejects with 409 and the frontend shows an inline "already exists" error on the field; the dialog stays open.
- **Given** a department with zero assigned members, **when** the user opens its Edit dialog and confirms Delete, **then** the department is removed from the table.
- **Given** a department with one or more assigned members, **when** the user opens its Edit dialog, **then** the Delete button is disabled with an inline explanation, and no delete request can be made from the UI.
- **Given** any department, **when** the user flips its Actions-column toggle, **then** a confirmation dialog opens and the Switch's visual state does not change yet.
- **Given** the confirmation dialog is open, **when** the user clicks Cancel, **then** the dialog closes and the department's status is unchanged.
- **Given** the confirmation dialog is open, **when** the user confirms, **then** the status update is submitted; on success the Switch updates to the new state, the dialog closes, and a success toast is shown; on failure the dialog stays open with an error toast and the Switch remains unchanged.
- **Given** the user types into the search box, **when** the debounce elapses, **then** the table shows only departments whose name matches, re-fetched from the server, starting from page 1.
- **Given** the user clicks the Departments or Members column header, **when** the request resolves, **then** the table is re-sorted by that column in the toggled direction, starting from page 1.
- **Given** more departments exist than the current loaded page(s), **when** the user scrolls to the bottom of the table, **then** the next page of results is fetched automatically and appended without losing the already-loaded rows — no button click required.
- **Given** a department with one or more assigned members, **when** the user clicks its Members count, **then** a dialog opens listing those members' names and emails.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Department name already exists | "A department with this name already exists." (inline field error) |
| Delete blocked (members assigned) | "This department has {N} member(s) assigned. Disable it instead, or reassign those members first." (inline, in the Edit dialog) |
| Department created | "Department created." |
| Department updated | "Department updated." |
| Department deleted | "Department deleted." |
| Department enabled | "Department enabled." |
| Department disabled | "Department disabled." |
| Status toggle failed | "Something went wrong. Please try again." |
| Server/network error (any request) | "Something went wrong. Please try again." |

---

## API Design

All endpoints are authenticated (session cookie via `requireAuth`, same as `/api/organizations/mine`) and scoped to the caller's current active organization (`User.activeOrganizationId` from [003](./003-header-navigation.md)) — no organization id is ever accepted from the client.

| Method | Path | Body / Query | Response (success) |
|--------|------|---------------|---------------------|
| GET | `/api/departments?search=&sortBy=name\|membersCount&sortDir=asc\|desc&page=&pageSize=` | — (query params, all optional; defaults: no search, `sortBy=name`, `sortDir=asc`, `page=1`, `pageSize=20`) | `{ departments: [{ id, name, isActive, membersCount }], hasMore: boolean }` |
| POST | `/api/departments` | `{ name }` | `{ department: { id, name, isActive, membersCount } }` (201) |
| PUT | `/api/departments/:id` | `{ name }` | `{ department: { id, name, isActive, membersCount } }` |
| PATCH | `/api/departments/:id/status` | `{ isActive }` | `{ department: { id, name, isActive, membersCount } }` |
| DELETE | `/api/departments/:id` | — | `{ message }` (204/200); 409 if `membersCount > 0` |
| GET | `/api/departments/:id/members` | — | `{ members: [{ id, name, email }] }` (unpaginated — see [Open Questions](#open-questions--assumptions)) |

Error responses follow the existing convention (`{ error: string }`): 400 (validation), 401 (no session), 404 (department doesn't belong to the caller's organization or doesn't exist), 409 (duplicate name on create/edit; non-zero `membersCount` on delete), 500 (unexpected).

## Data Model

- New `Department` model/table: `id`, `organizationId` (FK → `organizations`, `onDelete: CASCADE`), `name`, `isActive` (boolean, default `true`), `createdAt`/`updatedAt`. Unique index on `(organizationId, name)` as a DB-level backstop; the case-insensitive check itself happens in application code (same pattern as GST/email elsewhere in this codebase, and as `Grade` in [004](./004-grade-management.md)), since a plain unique index is case-sensitive.
- `OrganizationMember` gains a nullable `departmentId` (FK → `departments`, `onDelete: SET NULL`) — a separate column from [004](./004-grade-management.md)'s `gradeId`, since a member's grade and department are independent attributes. This is what "Members" counts/lists query against (`COUNT(*) WHERE departmentId = :id AND organizationId = :currentOrg`). No UI to *set* this column exists yet (see [Out of Scope](#out-of-scope)); it starts `null` for every existing membership.

## Validation Rules Summary

| Field type | Rule |
|------------|------|
| Department Name | Required, trimmed, 2–50 characters, unique per organization (case-insensitive) |

## Test Cases

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|------------------|
| TC-01 | Create a valid department | Click New Department, enter a unique name, Save | Department appears in table with 0 members, active |
| TC-02 | Create with empty name | New Department, leave name blank, Save | Blocked client-side, inline "required" error |
| TC-03 | Create with too-short/long name | New Department, enter 1 char or 51+ chars | Blocked client-side, inline length error |
| TC-04 | Create with duplicate name | New Department, enter a name that already exists (any case) | 409, inline "already exists" error, dialog stays open |
| TC-05 | Edit a department's name | Click Edit on a row, change name, Save | Table row updates to new name |
| TC-06 | Edit to a name used by another department | Edit, enter another existing department's name | 409, inline error, dialog stays open |
| TC-07 | Delete a department with 0 members | Edit a department with no members assigned, click Delete, confirm | Department removed from table |
| TC-08 | Delete blocked when members assigned | Edit a department with ≥1 member, open Delete | Delete button disabled, explanation shown, no request sent |
| TC-09 | Toggle opens confirmation | Click the Actions toggle on an active department | Confirmation dialog opens; Switch has not moved yet |
| TC-09b | Confirm disables a department | Confirm the dialog opened from an active department's toggle | Switch flips off, dialog closes, department shows inactive, success toast |
| TC-09c | Cancel leaves status unchanged | Open the toggle confirmation, click Cancel | Dialog closes, Switch/status unchanged |
| TC-10 | Toggle failure keeps dialog open | Confirm the dialog while the backend request fails | Dialog stays open, error toast shown, Switch unchanged |
| TC-11 | Search filters results | Type a partial department name into Search | Table shows only matching departments, re-fetched from page 1 |
| TC-12 | Sort by Departments name | Click the "Departments" column header | Table re-sorts alphabetically, direction toggles on repeated clicks |
| TC-13 | Sort by Members count | Click the "Members" column header | Table re-sorts by member count, direction toggles on repeated clicks |
| TC-14 | Infinite pagination loads more | Scroll to the bottom of a list with more than one page | Next page fetched and appended, no duplicate or missing rows |
| TC-15 | View members of a department | Click a Members count > 0 | Dialog opens listing those members' names and emails |
| TC-16 | Members count of 0 | Click a Members count of 0 | No dialog opens (nothing to show) |
| TC-17 | Server/network error on create/edit | Submit a valid name while the backend is unreachable | Generic error toast, dialog stays open with entered value intact |

## Edge Cases

- **Search + sort + pagination interplay**: changing search or sort always resets to page 1 — a user scrolled deep into page 3 who then searches must not see stale page-3 results mixed with new search results.
- **Race between toggle and delete**: since Delete is only reachable via Edit (which requires opening the dialog, an extra step vs. the instant toggle), a member could be assigned to a department between the moment the Edit dialog opens (showing "0 members," Delete enabled) and the moment Delete is confirmed. The backend re-checks `membersCount` at delete time regardless of what the dialog displayed when it opened, and returns 409 if it's grown to ≥1 — the frontend must surface that 409 as the same "members assigned" message, not a generic error.
- **Organization scoping on direct id access**: `PUT/PATCH/DELETE/GET /api/departments/:id(/...)` must 404 (not 403) if `:id` belongs to a different organization than the caller's active one, consistent with not leaking the existence of another org's data.
- **Disabling a department with members assigned**: explicitly allowed and has no side effect on those members — only Delete is blocked by member count, not the toggle.
- **Case-only duplicate names**: "Engineering" and "engineering" are treated as the same name for uniqueness purposes; the originally-entered casing is preserved and displayed as-is (not forced to a canonical case).
- **Independent of Grade Management**: a member's grade ([004](./004-grade-management.md)) and department are unrelated attributes stored in separate columns — deleting/disabling a grade has no effect on department assignments and vice versa.

## Out of Scope

- Assigning a department *to* a member — no UI exists to set `OrganizationMember.departmentId` in this story; that belongs to the future Employee Management screen (currently a placeholder per [003](./003-header-navigation.md)). Until that ships, every department will show 0 members in real usage.
- Role-based restriction of who can manage departments — consistent with [003](./003-header-navigation.md)'s existing decision, every logged-in user with access to Company Settings can fully manage departments; no permission system exists yet to gate this further.
- Reassigning a department's members to a different department as part of the delete flow (the blocked-delete message tells the user to do this "elsewhere," but no such UI exists yet since Employee Management doesn't exist).
- Departmental hierarchy (parent/child departments, sub-departments) — this story is a flat, single-level list, matching the single "Department Name" field requested.
- Bulk actions (bulk delete, bulk enable/disable, CSV import/export of departments).
- Filtering the list by active/inactive status — both states are shown together in the same table, distinguished only by the toggle's visual state.
- Pagination on the Members dialog — it returns the full member list for a department in one response; revisit if a single department's membership ever grows large enough for this to matter.
- Audit history of department changes (who created/renamed/disabled a department, and when).

## Open Questions / Assumptions

This story mirrors [004-grade-management.md](./004-grade-management.md)'s resolved decisions exactly, substituting "grade" for "department":

- **Status toggle requires confirmation, built that way from the start**: unlike [004](./004-grade-management.md), which originally specced an instant/optimistic toggle and had that superseded after implementation, this story was implemented with the confirmation dialog from day one (Delete already required confirmation, so both destructive-feeling actions behave consistently) — there's no "original decision" to supersede here, just the already-current pattern.
- **Delete lives inside the Edit dialog, not as a table-row icon**: the requested Actions column explicitly enumerates only Edit and the enable/disable toggle, while CRUD requires a delete path somewhere. Resolved by placing Delete inside the Edit dialog as a secondary, confirmation-gated action, blocked whenever the department has assigned members.
- **Delete vs. disable are deliberately different gates**: disabling is always allowed (no member-count check) since it doesn't touch existing assignments; hard delete is blocked whenever `membersCount > 0`, since removing the department would orphan those members' `departmentId`.
- **Members dialog has no pagination**: it returns everything in one call — fine at today's expected scale, flagged so it isn't mistaken for an oversight later.
- **Pagination style is page-number-based (`page`/`pageSize`), not cursor-based**, despite being described as "infinite" on the frontend (append-on-scroll) — same rationale as [004](./004-grade-management.md): no existing pagination convention to build on, sufficient at the expected scale.
- **No new frontend form/table libraries added**: no `react-hook-form`/`zod`/`@tanstack/react-table` introduced; sorting/search/pagination are driven by plain state and the query params above, matching this codebase's existing hand-rolled validation pattern. Implementation will need shadcn's `table`, `dialog`, and `switch` primitives — the same ones [004](./004-grade-management.md) needs, so build both stories together (or reuse a shared table/dialog scaffold) rather than duplicating the same primitive-adding work twice.
- **`Grade` and `Department` are separate tables/columns, not a shared "lookup type" table**: a generalized `Lookup { type: "grade"|"department", name, isActive }` table would avoid two near-identical schemas, but was not chosen here, mirroring why [002](./002-organization-signup.md) generalized OTPs but this codebase hasn't generalized every pair of similar tables — two small, independently-evolvable tables are simpler to reason about than one generalized table with a discriminant, especially since Grade and Department may diverge in fields later (e.g. a department might eventually get a manager/head, which a grade never would). Revisit only if a third near-identical "lookup" entity shows up and the duplication actually starts to hurt.
