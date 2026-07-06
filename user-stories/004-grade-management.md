# 004 - Grade Management

**Status:** Draft
**Epic:** Grade Management

## Overview

Covers full CRUD for **Grades** — the job-level labels (e.g. "L1", "Senior Manager") an organization defines for its members — reachable from Company Settings → Grades. This replaces the placeholder page created in [003-header-navigation.md](./003-header-navigation.md) (`/company-settings/grades`, currently `<ComingSoon title="Grades" />`) with the real screen; no new route is introduced. Grades are scoped per-organization (the current active organization, per [003](./003-header-navigation.md)'s `activeOrganizationId`), have exactly one editable field (name) plus an active/inactive status, and can be viewed alongside the count of organization members currently assigned to each one. Assigning a grade *to* a member is not built here — that belongs to the not-yet-built Employee Management screen (see [Out of Scope](#out-of-scope)); this story only displays and manages the grades themselves.

---

## Story: Manage Grades

**As a** logged-in user
**I want** to create, edit, enable/disable, and delete my organization's grades, and see who's assigned to each
**So that** I can define and maintain the job levels my organization uses

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Grade Management | Search | text (global search by grade name) | — |
| Grade Management | "New Grade" button | button → opens Add Grade dialog | — |
| Grade Management | Grades table (Grade, Members, Actions columns — see below) | table | — |
| Add/Edit Grade dialog | Grade Name | text | Yes |
| Add/Edit Grade dialog | Save button | button | — |
| Add/Edit Grade dialog | Cancel / close | link/button → closes dialog, discards changes | — |
| Edit Grade dialog only | Delete button | button → opens delete-confirmation, disabled when the grade has ≥1 assigned member | — |
| Members dialog (opened by clicking a grade's Members count) | Member list (name + email) | read-only list | — |
| Members dialog | Close | button → closes dialog | — |
| Status confirmation dialog (opened by flipping the Actions-column Switch) | "Enable/Disable this grade?" with Cancel / Enable/Disable | dialog | — |

**Table columns:**

| Column | Content | Sortable |
|--------|---------|----------|
| Grade | Grade name | Yes |
| Members | Count of organization members currently assigned this grade; clicking it opens the Members dialog for that grade | Yes (by count) |
| Actions | Edit icon (opens Edit Grade dialog) + a Switch toggle for active/inactive | No |

### Flow

1. On load, the screen fetches the first page of the current organization's grades (default sort: Grade name, ascending), each row showing its name, member count, current active/inactive state, and an Edit action.
2. **Search**: typing in the search box (debounced) re-queries the list filtered by grade name (server-side substring match, case-insensitive) — it does not just filter whatever rows are already loaded, since not all rows are loaded at once (see Pagination below). Changing the search term resets the loaded set back to page 1.
3. **Sorting**: clicking the Grade or Members column header toggles that column's sort direction (ascending → descending → ascending) and re-queries from page 1 with the new `sortBy`/`sortDir`. Only one column is sorted at a time.
4. **Pagination**: the table loads a fixed page size (20) at a time; scrolling to the bottom of the loaded rows automatically fetches and appends the next page (true infinite scroll — there is no "Load more" button). A small loading indicator appears at the bottom while the next page is being fetched. This resets to page 1 whenever search or sort changes.
5. **Add**: clicking "New Grade" opens a dialog with an empty Grade Name field. Client-side validation runs on submit (required, length). On submit, the frontend calls the create API.
   - **Success** → new grade appears in the table (member count 0, active by default); dialog closes; success toast shown.
   - **Duplicate name** (case-insensitive, within this organization) → backend rejects with 409; frontend shows it as an inline field error on Grade Name; dialog stays open.
   - **Unexpected server error** → generic error toast; dialog stays open with the entered value intact.
6. **Edit**: clicking a row's Edit icon opens the same dialog pre-filled with that grade's current name, plus a Delete button. Submitting Save behaves the same as Add (validation, duplicate-name handling) but calls the update API instead, keyed to that grade's id.
7. **Delete** (from within the Edit dialog only — there is no delete action directly in the table row): clicking Delete shows a confirmation step. If the grade currently has zero assigned members, confirming calls the delete API and removes the row on success. If the grade has one or more assigned members, the Delete button is disabled with an inline explanation ("This grade has N member(s) assigned. Disable it instead, or reassign those members first.") — reassignment itself isn't available yet since Employee Management doesn't exist (see [Out of Scope](#out-of-scope)).
8. **Enable/disable toggle**: flipping the Actions column's Switch does **not** change status immediately — it opens a confirmation dialog ("Enable this grade?" / "Disable this grade?", with Cancel and a confirm button labeled Enable/Disable). The Switch's visual state doesn't move until the dialog is confirmed; clicking Cancel (or dismissing the dialog) leaves it exactly as it was. Confirming calls the status-update API; on success the Switch updates to the new state and the dialog closes with a success toast ("Grade enabled."/"Grade disabled."); on failure the dialog stays open with an error toast and the Switch remains unchanged. Disabling a grade does **not** affect members already assigned to it — it only means the grade shouldn't be offered when assigning a *new* grade to a member in the future (not enforced by this story, since that assignment UI doesn't exist yet).
9. **Viewing members**: clicking a grade's Members count (when > 0) opens a read-only dialog listing every organization member currently assigned that grade (name + email). Clicking a Members count of 0 does nothing (no dialog, since there's nothing to show) — see [Open Questions](#open-questions--assumptions).

### Validation Rules

| Field | Rule |
|-------|------|
| Grade Name | Required. Trimmed length 2–50 characters. Must be unique within the current organization, case-insensitive (checked server-side on create/edit; no live-check-on-blur, unlike GST in [002](./002-organization-signup.md) — this is an internal admin field, not worth the extra round-trip). |

### Acceptance Criteria

- **Given** a valid, unused (within this org) Grade Name, **when** the user submits Add or Edit, **then** the grade is created/updated, the dialog closes, and the table reflects the change.
- **Given** a Grade Name that's empty or outside the 2–50 character range, **when** the user attempts to submit, **then** the dialog is blocked client-side with an inline "required"/"length" error and no API call is made.
- **Given** a Grade Name that already exists in this organization (case-insensitive), **when** the user submits, **then** the backend rejects with 409 and the frontend shows an inline "already exists" error on the field; the dialog stays open.
- **Given** a grade with zero assigned members, **when** the user opens its Edit dialog and confirms Delete, **then** the grade is removed from the table.
- **Given** a grade with one or more assigned members, **when** the user opens its Edit dialog, **then** the Delete button is disabled with an inline explanation, and no delete request can be made from the UI.
- **Given** any grade, **when** the user flips its Actions-column toggle, **then** a confirmation dialog opens and the Switch's visual state does not change yet.
- **Given** the confirmation dialog is open, **when** the user clicks Cancel, **then** the dialog closes and the grade's status is unchanged.
- **Given** the confirmation dialog is open, **when** the user confirms, **then** the status update is submitted; on success the Switch updates to the new state, the dialog closes, and a success toast is shown; on failure the dialog stays open with an error toast and the Switch remains unchanged.
- **Given** the user types into the search box, **when** the debounce elapses, **then** the table shows only grades whose name matches, re-fetched from the server, starting from page 1.
- **Given** the user clicks the Grade or Members column header, **when** the request resolves, **then** the table is re-sorted by that column in the toggled direction, starting from page 1.
- **Given** more grades exist than the current loaded page(s), **when** the user scrolls to the bottom of the table, **then** the next page of results is fetched automatically and appended without losing the already-loaded rows — no button click required.
- **Given** a grade with one or more assigned members, **when** the user clicks its Members count, **then** a dialog opens listing those members' names and emails.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Grade name already exists | "A grade with this name already exists." (inline field error) |
| Delete blocked (members assigned) | "This grade has {N} member(s) assigned. Disable it instead, or reassign those members first." (inline, in the Edit dialog) |
| Grade created | "Grade created." |
| Grade updated | "Grade updated." |
| Grade deleted | "Grade deleted." |
| Grade enabled | "Grade enabled." |
| Grade disabled | "Grade disabled." |
| Status toggle failed | "Something went wrong. Please try again." |
| Server/network error (any request) | "Something went wrong. Please try again." |

---

## API Design

All endpoints are authenticated (session cookie via `requireAuth`, same as `/api/organizations/mine`) and scoped to the caller's current active organization (`User.activeOrganizationId` from [003](./003-header-navigation.md)) — no organization id is ever accepted from the client.

| Method | Path | Body / Query | Response (success) |
|--------|------|---------------|---------------------|
| GET | `/api/grades?search=&sortBy=name\|membersCount&sortDir=asc\|desc&page=&pageSize=` | — (query params, all optional; defaults: no search, `sortBy=name`, `sortDir=asc`, `page=1`, `pageSize=20`) | `{ grades: [{ id, name, isActive, membersCount }], hasMore: boolean }` |
| POST | `/api/grades` | `{ name }` | `{ grade: { id, name, isActive, membersCount } }` (201) |
| PUT | `/api/grades/:id` | `{ name }` | `{ grade: { id, name, isActive, membersCount } }` |
| PATCH | `/api/grades/:id/status` | `{ isActive }` | `{ grade: { id, name, isActive, membersCount } }` |
| DELETE | `/api/grades/:id` | — | `{ message }` (204/200); 409 if `membersCount > 0` |
| GET | `/api/grades/:id/members` | — | `{ members: [{ id, name, email }] }` (unpaginated — see [Open Questions](#open-questions--assumptions)) |

Error responses follow the existing convention (`{ error: string }`): 400 (validation), 401 (no session), 404 (grade doesn't belong to the caller's organization or doesn't exist), 409 (duplicate name on create/edit; non-zero `membersCount` on delete), 500 (unexpected).

## Data Model

- New `Grade` model/table: `id`, `organizationId` (FK → `organizations`, `onDelete: CASCADE`), `name`, `isActive` (boolean, default `true`), `createdAt`/`updatedAt`. Unique index on `(organizationId, name)` as a DB-level backstop; the case-insensitive check itself happens in application code (same pattern as GST/email elsewhere in this codebase), since a plain unique index is case-sensitive.
- `OrganizationMember` gains a nullable `gradeId` (FK → `grades`, `onDelete: SET NULL`) — this is the only schema change to that table, and is what "Members" counts/lists query against (`COUNT(*) WHERE gradeId = :id AND organizationId = :currentOrg`). No UI to *set* this column exists yet (see [Out of Scope](#out-of-scope)); it starts `null` for every existing membership.

## Validation Rules Summary

| Field type | Rule |
|------------|------|
| Grade Name | Required, trimmed, 2–50 characters, unique per organization (case-insensitive) |

## Test Cases

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|------------------|
| TC-01 | Create a valid grade | Click New Grade, enter a unique name, Save | Grade appears in table with 0 members, active |
| TC-02 | Create with empty name | New Grade, leave name blank, Save | Blocked client-side, inline "required" error |
| TC-03 | Create with too-short/long name | New Grade, enter 1 char or 51+ chars | Blocked client-side, inline length error |
| TC-04 | Create with duplicate name | New Grade, enter a name that already exists (any case) | 409, inline "already exists" error, dialog stays open |
| TC-05 | Edit a grade's name | Click Edit on a row, change name, Save | Table row updates to new name |
| TC-06 | Edit to a name used by another grade | Edit, enter another existing grade's name | 409, inline error, dialog stays open |
| TC-07 | Delete a grade with 0 members | Edit a grade with no members assigned, click Delete, confirm | Grade removed from table |
| TC-08 | Delete blocked when members assigned | Edit a grade with ≥1 member, open Delete | Delete button disabled, explanation shown, no request sent |
| TC-09 | Toggle opens confirmation | Click the Actions toggle on an active grade | Confirmation dialog opens; Switch has not moved yet |
| TC-09b | Confirm disables a grade | Confirm the dialog opened from an active grade's toggle | Switch flips off, dialog closes, grade shows inactive, success toast |
| TC-09c | Cancel leaves status unchanged | Open the toggle confirmation, click Cancel | Dialog closes, Switch/status unchanged |
| TC-10 | Toggle failure keeps dialog open | Confirm the dialog while the backend request fails | Dialog stays open, error toast shown, Switch unchanged |
| TC-11 | Search filters results | Type a partial grade name into Search | Table shows only matching grades, re-fetched from page 1 |
| TC-12 | Sort by Grade name | Click the "Grade" column header | Table re-sorts alphabetically, direction toggles on repeated clicks |
| TC-13 | Sort by Members count | Click the "Members" column header | Table re-sorts by member count, direction toggles on repeated clicks |
| TC-14 | Infinite pagination loads more | Scroll to the bottom of a list with more than one page | Next page fetched and appended, no duplicate or missing rows |
| TC-15 | View members of a grade | Click a Members count > 0 | Dialog opens listing those members' names and emails |
| TC-16 | Members count of 0 | Click a Members count of 0 | No dialog opens (nothing to show) |
| TC-17 | Server/network error on create/edit | Submit a valid name while the backend is unreachable | Generic error toast, dialog stays open with entered value intact |

## Edge Cases

- **Search + sort + pagination interplay**: changing search or sort always resets to page 1 — a user scrolled deep into page 3 who then searches must not see stale page-3 results mixed with new search results.
- **Race between toggle and delete**: since Delete is only reachable via Edit (which requires opening the dialog, an extra step vs. the instant toggle), a member could be assigned to a grade between the moment the Edit dialog opens (showing "0 members," Delete enabled) and the moment Delete is confirmed. The backend re-checks `membersCount` at delete time regardless of what the dialog displayed when it opened, and returns 409 if it's grown to ≥1 — the frontend must surface that 409 as the same "members assigned" message, not a generic error.
- **Organization scoping on direct id access**: `PUT/PATCH/DELETE/GET /api/grades/:id(/...)` must 404 (not 403) if `:id` belongs to a different organization than the caller's active one, consistent with not leaking the existence of another org's data — same posture as [003](./003-header-navigation.md)'s switch-organization 403 doesn't apply here since this isn't "wrong org among your own," it's "not your org at all."
- **Disabling a grade with members assigned**: explicitly allowed and has no side effect on those members — only Delete is blocked by member count, not the toggle.
- **Case-only duplicate names**: "Manager" and "manager" are treated as the same name for uniqueness purposes; the originally-entered casing is preserved and displayed as-is (not forced to a canonical case).

## Out of Scope

- Assigning a grade *to* a member — no UI exists to set `OrganizationMember.gradeId` in this story; that belongs to the future Employee Management screen (currently a placeholder per [003](./003-header-navigation.md)). Until that ships, every grade will show 0 members in real usage.
- Role-based restriction of who can manage grades — consistent with [003](./003-header-navigation.md)'s existing decision, every logged-in user with access to Company Settings can fully manage grades; no permission system exists yet to gate this further.
- Reassigning a grade's members to a different grade as part of the delete flow (the blocked-delete message tells the user to do this "elsewhere," but no such UI exists yet since Employee Management doesn't exist).
- Bulk actions (bulk delete, bulk enable/disable, CSV import/export of grades).
- Filtering the list by active/inactive status — both states are shown together in the same table, distinguished only by the toggle's visual state.
- Pagination on the Members dialog — it returns the full member list for a grade in one response; revisit if a single grade's membership ever grows large enough for this to matter.
- Audit history of grade changes (who created/renamed/disabled a grade, and when).

## Open Questions / Assumptions

- **Delete lives inside the Edit dialog, not as a table-row icon**: the requested Actions column explicitly enumerates only Edit and the enable/disable toggle, while CRUD requires a delete path somewhere. Resolved by placing Delete inside the Edit dialog as a secondary, confirmation-gated action, blocked whenever the grade has assigned members — this avoids a destructive one-click icon sitting in the row next to a routine toggle, and doesn't contradict the literal column spec.
- **Delete vs. disable are deliberately different gates**: disabling is always allowed (no member-count check) since it doesn't touch existing assignments; hard delete is blocked whenever `membersCount > 0`, since removing the grade would orphan those members' `gradeId`. This asymmetry is intentional, not an inconsistency.
- **Members dialog has no pagination**: unlike the main grades table, the Members dialog returns everything in one call. This is fine at today's expected scale (grades per org, members per grade) but should be revisited if that assumption stops holding — flagged here so it isn't mistaken for an oversight later, mirroring how [003](./003-header-navigation.md) flagged its own scale assumptions.
- **Pagination style is page-number-based (`page`/`pageSize`), not cursor-based**, despite being described as "infinite" on the frontend (append-on-scroll). Offset pagination is simpler to implement with no existing pagination convention in this codebase to build on, and is sufficient at the expected scale (an organization's grade list, not a firehose table) — cursor-based pagination is a reasonable future upgrade if that assumption stops holding, not a correctness issue today.
- **No new frontend form/table libraries added**: consistent with this codebase's existing hand-rolled validation pattern (local `FieldErrors` state + a `validate()` function, as used throughout [001](./001-authentication.md)/[002](./002-organization-signup.md)), this story does not introduce `react-hook-form`/`zod` for the Add/Edit dialog, nor `@tanstack/react-table` for the grid — sorting/search/pagination are driven by plain state and the query params above. Implementation will need to add shadcn's `table`, `dialog`, and `switch` primitives (none exist in `src/components/ui/` yet), which is expected, not a gap in this story.
- **Status toggle now requires confirmation — supersedes this doc's original decision**: this story originally specified the toggle as instant (no confirmation, no separate save step, optimistic update with revert-on-failure), reasoning that disabling is always reversible and low-risk. That was changed after implementation, at explicit request: every enable/disable now opens a confirmation dialog, and the API call only happens on confirm (no optimistic UI update at all — the Switch's `checked` state is purely server-driven and only moves after a successful response). The underlying `PATCH /api/grades/:id/status` contract is unchanged; only the frontend's interaction pattern differs from what's described elsewhere in this doc as the original design. Since Delete already requires confirmation, both destructive-feeling actions in this dialog now behave consistently.
