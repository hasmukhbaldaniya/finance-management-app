# 006 - Roles & Privileges Management

**Status:** Draft
**Epic:** Roles & Privileges Management

## Overview

Covers full CRUD for **Roles** — a name plus a checked subset of a fixed set of privileges — reachable from Company Settings → Roles & Privileges. This replaces the placeholder page created in [003-header-navigation.md](./003-header-navigation.md) (`/company-settings/roles-privileges`, currently `<ComingSoon title="Roles & Privileges" />`) with the real screen; no new route is introduced. Roles are scoped per-organization (the current active organization, per [003](./003-header-navigation.md)'s `activeOrganizationId`), same as [Grade](./004-grade-management.md) and [Department](./005-department-management.md). Unlike those two stories, every organization starts with **two seeded, non-editable roles** — **Company Admin** and **Members** — alongside any number of custom roles a user creates. Assigning a role *to* a member is not built here — that belongs to the not-yet-built Employee Management screen (see [Out of Scope](#out-of-scope)); this story only displays and manages the roles themselves.

**Naming collision, called out up front**: `OrganizationMember` already has a `role` column (a plain string, `"owner"` | `"member"`, set at signup in [002-organization-signup.md](./002-organization-signup.md) and never otherwise used). That column is unrelated to this story's `Role` entity — it predates this feature and this story does not rename, remove, or repurpose it. See [Data Model](#data-model) for how the two coexist, and [Open Questions](#open-questions--assumptions) for the backfill decision that connects them once, at migration time only.

---

## Story: Manage Roles & Privileges

**As a** logged-in user
**I want** to create, edit, enable/disable, and delete custom roles (and view, but not change, the two default roles), and see who's assigned to each
**So that** I can control which privileges different people in my organization have

### The privilege catalog

A fixed, product-defined list of 8 privileges — not user-editable, not something this story lets anyone add to or rename. Every Add/Edit Role dialog shows exactly these 8 as checkboxes, in this order:

| Key | Label |
|-----|-------|
| `employee_management` | Employee management |
| `basic_features` | Basic Features |
| `category_management` | Category Management |
| `create_claims_trips` | Create Claim / Trips |
| `claim_trip_approvals` | Claim / Trip Approvals |
| `reports` | Reports |
| `finance_view` | Finance View |
| `consumption_billing` | Consumption & Billing |

### The two default roles

Seeded once per organization (see [Data Model](#data-model) for exactly when), never created by a user, and permanently protected from edit/delete/disable:

| Role | Role Type | Privileges checked by default |
|------|-----------|-------------------------------|
| Company Admin | Default | All 8 |
| Members | Default | Employee management, Basic Features, Category Management, Create Claim / Trips |

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Roles & Privileges | Search | text (global search by role name) | — |
| Roles & Privileges | "New Role" button | button → opens Add Role dialog | — |
| Roles & Privileges | Roles table (Role, Role Type, Members, Actions columns — see below) | table | — |
| Add/Edit Role dialog (custom roles only) | Role Name | text | Yes |
| Add/Edit Role dialog | Privilege checkboxes (the 8 above) | checkbox group | No (zero-or-more) |
| Add/Edit Role dialog | Save button | button | — |
| Add/Edit Role dialog | Cancel / close | link/button → closes dialog, discards changes | — |
| Edit Role dialog only (custom roles) | Delete button | button → opens delete-confirmation, disabled when the role has ≥1 assigned member | — |
| View Role dialog (default roles only) | Role Name, privilege checkboxes | text + checkboxes, all read-only/disabled | — |
| View Role dialog | Close | button → closes dialog (no Save, no Delete) | — |
| Members dialog (opened by clicking a role's Members count) | Member list (name + email) | read-only list | — |
| Members dialog | Close | button → closes dialog | — |

**Table columns:**

| Column | Content | Sortable |
|--------|---------|----------|
| Role | Role name | Yes |
| Role Type | "Default" (Company Admin, Members) or "Custom" (everything else) | Yes |
| Members | Count of organization members currently assigned this role; clicking it opens the Members dialog for that role | Yes (by count) |
| Actions | **Default rows**: a View icon (opens the read-only View Role dialog) + a disabled toggle (see below). **Custom rows**: an Edit icon (opens the Add/Edit Role dialog, pre-filled) + a fully interactive toggle. | No |

### Flow

1. On load, the screen fetches the first page of the current organization's roles (default sort: Role name, ascending), each row showing its name, role type, member count, active/inactive state, and either a View or Edit action depending on `isDefault`.
2. **Search**: typing in the search box (debounced) re-queries the list filtered by role name (server-side substring match, case-insensitive) — it does not just filter whatever rows are already loaded, since not all rows are loaded at once (see Pagination below). Changing the search term resets the loaded set back to page 1. Default roles are searchable like any other row.
3. **Sorting**: clicking the Role, Role Type, or Members column header toggles that column's sort direction (ascending → descending → ascending) and re-queries from page 1 with the new `sortBy`/`sortDir`. Only one column is sorted at a time. **Company Admin and Members always occupy the first two rows, ahead of every custom role, regardless of which column or direction is sorted** — sorting only reorders within the default group and within the custom group separately; it can never let a custom role outrank a default one. (If a search term excludes a default role by name, it's simply absent like any other non-matching row — pinning only applies among rows that already passed the search filter.)
4. **Pagination**: the table loads a fixed page size (20) at a time; scrolling to the bottom of the loaded rows automatically fetches and appends the next page (true infinite scroll — there is no "Load more" button), matching [004](./004-grade-management.md)/[005](./005-department-management.md). A small loading indicator appears at the bottom while the next page is being fetched. This resets to page 1 whenever search or sort changes.
5. **Add** (always produces a custom role — there is no way to create another default role): clicking "New Role" opens a dialog with an empty Role Name and every privilege checkbox unchecked. Client-side validation runs on submit (name required, length). On submit, the frontend calls the create API with the name and the checked privilege keys.
   - **Success** → new role appears in the table (Role Type "Custom", member count 0, active by default); dialog closes; success toast shown.
   - **Duplicate name** (case-insensitive, within this organization — this naturally also blocks naming a custom role "Company Admin" or "Members," since those already occupy those exact names as real rows) → backend rejects with 409; frontend shows it as an inline field error on Role Name; dialog stays open.
   - **Unexpected server error** → generic error toast; dialog stays open with the entered values intact.
6. **Edit** (custom roles only): clicking a custom row's Edit icon opens the same dialog pre-filled with that role's current name and checked privileges, plus a Delete button. Submitting Save behaves the same as Add (validation, duplicate-name handling) but calls the update API instead, keyed to that role's id.
7. **View** (default roles only): clicking a default row's View icon opens a dialog showing the name and privilege checkboxes exactly as Edit does, but every field is disabled and there is no Save or Delete button — only Close.
8. **Delete** (from within the Edit dialog only, custom roles only — default roles have no Delete anywhere): clicking Delete shows a confirmation step. If the role currently has zero assigned members, confirming calls the delete API and removes the row on success. If the role has one or more assigned members, the Delete button is disabled with an inline explanation ("This role has N member(s) assigned. Disable it instead, or reassign those members first.") — reassignment itself isn't available yet since Employee Management doesn't exist (see [Out of Scope](#out-of-scope)).
9. **Enable/disable toggle**: on a custom role, flipping the Actions column's Switch does **not** change status immediately — it opens a confirmation dialog ("Enable this role?" / "Disable this role?", with Cancel and a confirm button labeled Enable/Disable), matching [004](./004-grade-management.md)/[005](./005-department-management.md)'s Grade/Department toggle (see [004](./004-grade-management.md)'s Open Questions for why this superseded an originally-specced instant/optimistic toggle). The Switch's visual state doesn't move until the dialog is confirmed; Cancel or a failed request leaves it exactly as it was. Confirming calls the status-update API; on success the Switch updates and the dialog closes with a success toast ("Role enabled."/"Role disabled."); on failure the dialog stays open with an error toast. On a default role, the toggle is rendered but disabled (not clickable, no dialog opens), since Company Admin and Members must always stay active — every organization depends on them existing and enabled (see [Open Questions](#open-questions--assumptions)). Disabling a custom role does **not** affect members already assigned to it — it only means the role shouldn't be offered when assigning a *new* role to a member in the future (not enforced by this story, since that assignment UI doesn't exist yet).
10. **Viewing members**: clicking a role's Members count (when > 0) opens a read-only dialog listing every organization member currently assigned that role (name + email) — this applies equally to default and custom roles. Clicking a Members count of 0 does nothing (no dialog, since there's nothing to show).

### Validation Rules

| Field | Rule |
|-------|------|
| Role Name | Required. Trimmed length 2–50 characters. Must be unique within the current organization, case-insensitive (checked server-side on create/edit; no live-check-on-blur, same as [Grade](./004-grade-management.md)/[Department](./005-department-management.md)). Only applies to custom roles — default roles are never created or renamed through this form. |
| Privilege checkboxes | Optional (zero or more may be checked). Each submitted key must be one of the 8 fixed keys in the [privilege catalog](#the-privilege-catalog) — unknown keys are rejected server-side with 400, since the set is fixed and not user-extensible. |

### Acceptance Criteria

- **Given** the Roles & Privileges screen loads for any organization, **when** the table renders, **then** Company Admin and Members are present as rows with Role Type "Default," Company Admin showing all 8 privileges and Members showing its 4, and both showing a View action (not Edit) and a disabled toggle.
- **Given** a valid, unused (within this org) Role Name, **when** the user submits Add or Edit with any subset of privileges checked, **then** the custom role is created/updated with exactly those privileges, the dialog closes, and the table reflects the change.
- **Given** a Role Name that's empty or outside the 2–50 character range, **when** the user attempts to submit, **then** the dialog is blocked client-side with an inline "required"/"length" error and no API call is made.
- **Given** a Role Name that already exists in this organization (case-insensitive, including "Company Admin" or "Members"), **when** the user submits, **then** the backend rejects with 409 and the frontend shows an inline "already exists" error on the field; the dialog stays open.
- **Given** a default role, **when** the user clicks its Actions icon, **then** a read-only View dialog opens with no Save or Delete control, and its toggle cannot be flipped.
- **Given** a custom role with zero assigned members, **when** the user opens its Edit dialog and confirms Delete, **then** the role is removed from the table.
- **Given** a custom role with one or more assigned members, **when** the user opens its Edit dialog, **then** the Delete button is disabled with an inline explanation, and no delete request can be made from the UI.
- **Given** a custom role, **when** the user flips its Actions-column toggle, **then** a confirmation dialog opens and the Switch's visual state does not change yet.
- **Given** the confirmation dialog is open, **when** the user clicks Cancel, **then** the dialog closes and the role's status is unchanged.
- **Given** the confirmation dialog is open, **when** the user confirms, **then** the status update is submitted; on success the Switch updates to the new state, the dialog closes, and a success toast is shown; on failure the dialog stays open with an error toast and the Switch remains unchanged.
- **Given** the user types into the search box, **when** the debounce elapses, **then** the table shows only roles (default or custom) whose name matches, re-fetched from the server, starting from page 1.
- **Given** the user clicks the Role, Role Type, or Members column header, **when** the request resolves, **then** the table is re-sorted by that column in the toggled direction, starting from page 1.
- **Given** any sort column/direction and an organization with one or more custom roles, **when** the table renders, **then** Company Admin and Members are always the first two rows, ahead of every custom role.
- **Given** more roles exist than the current loaded page(s), **when** the user scrolls to the bottom of the table, **then** the next page of results is fetched automatically and appended without losing the already-loaded rows — no button click required.
- **Given** any role (default or custom) with one or more assigned members, **when** the user clicks its Members count, **then** a dialog opens listing those members' names and emails.
- **Given** a request that attempts to edit, delete, or toggle a default role directly against the API (bypassing the disabled UI), **when** the backend processes it, **then** it is rejected with 403 regardless of what the client sends.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Role name already exists | "A role with this name already exists." (inline field error) |
| Delete blocked (members assigned) | "This role has {N} member(s) assigned. Disable it instead, or reassign those members first." (inline, in the Edit dialog) |
| Attempted edit/delete/toggle of a default role (API-level, defense in depth) | "Default roles can't be changed." |
| Role created | "Role created." |
| Role updated | "Role updated." |
| Role deleted | "Role deleted." |
| Role enabled | "Role enabled." |
| Role disabled | "Role disabled." |
| Status toggle failed | "Something went wrong. Please try again." |
| Server/network error (any request) | "Something went wrong. Please try again." |

---

## API Design

All endpoints are authenticated (session cookie via `requireAuth`, same as `/api/organizations/mine`) and scoped to the caller's current active organization (`User.activeOrganizationId` from [003](./003-header-navigation.md)) — no organization id is ever accepted from the client. The privilege catalog itself is not served by an API — it's a fixed constant duplicated in both frontend and backend code (same convention as this codebase's regex constants), since it's a product-defined list, not organization-editable data.

| Method | Path | Body / Query | Response (success) |
|--------|------|---------------|---------------------|
| GET | `/api/roles?search=&sortBy=name\|roleType\|membersCount&sortDir=asc\|desc&page=&pageSize=` | — (query params, all optional; defaults: no search, `sortBy=name`, `sortDir=asc`, `page=1`, `pageSize=20`) | `{ roles: [{ id, name, isDefault, isActive, membersCount, privileges: string[] }], hasMore: boolean }` |
| POST | `/api/roles` | `{ name, privileges: string[] }` | `{ role: { id, name, isDefault: false, isActive, membersCount, privileges } }` (201) |
| PUT | `/api/roles/:id` | `{ name, privileges: string[] }` | `{ role: {...} }`; 403 if `isDefault` |
| PATCH | `/api/roles/:id/status` | `{ isActive }` | `{ role: {...} }`; 403 if `isDefault` |
| DELETE | `/api/roles/:id` | — | `{ message }` (204/200); 403 if `isDefault`; 409 if `membersCount > 0` |
| GET | `/api/roles/:id/members` | — | `{ members: [{ id, name, email }] }` (unpaginated — same as [004](./004-grade-management.md)/[005](./005-department-management.md)) |

Error responses follow the existing convention (`{ error: string }`): 400 (validation, including an unknown privilege key), 401 (no session), 403 (attempted edit/status-change/delete of a default role), 404 (role doesn't belong to the caller's organization or doesn't exist), 409 (duplicate name on create/edit; non-zero `membersCount` on delete of a custom role), 500 (unexpected).

## Data Model

- New `Role` model/table: `id`, `organizationId` (FK → `organizations`, `onDelete: CASCADE`), `name`, `isDefault` (boolean, default `false`), `isActive` (boolean, default `true`), `privileges` (`ARRAY(STRING)`, storing the subset of the 8 fixed keys that are checked — a plain Postgres string array, not a join table, since the catalog itself is a fixed, code-defined enum rather than organization-editable data), `createdAt`/`updatedAt`. Unique index on `(organizationId, name)` as a DB-level backstop, same case-insensitive-at-the-application-layer pattern as [Grade](./004-grade-management.md)/[Department](./005-department-management.md).
- `OrganizationMember` gains a nullable `roleId` (FK → `roles`, `onDelete: SET NULL`) — a separate column from [004](./004-grade-management.md)'s `gradeId` and [005](./005-department-management.md)'s `departmentId`. This is what "Members" counts/lists query against (`COUNT(*) WHERE roleId = :id AND organizationId = :currentOrg`).
- **`OrganizationMember.role` (the pre-existing `"owner"`/`"member"` string column) is untouched** — it is not renamed, migrated, or repurposed into this feature's `roleId`. The two are independent columns on the same table that happen to share the word "role"; see [Open Questions](#open-questions--assumptions) for the one place they're connected (a one-time backfill, not an ongoing relationship).
- **Seeding**: every organization gets its own Company Admin and Members rows in `roles` (not shared/global rows) — seeded (a) in the migration that creates the `roles` table, once per existing organization, and (b) going forward, inside `registration.controller.ts`'s `createRegistration` (the same place `Organization` and the creator's `OrganizationMember` row are already created for [002](./002-organization-signup.md)), so every newly-registered organization has both default roles from the moment it exists.

## Validation Rules Summary

| Field type | Rule |
|------------|------|
| Role Name | Required, trimmed, 2–50 characters, unique per organization (case-insensitive); custom roles only |
| Privilege key | Must be one of the 8 fixed keys in the [privilege catalog](#the-privilege-catalog); unknown keys rejected with 400 |

## Test Cases

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|------------------|
| TC-01 | Default roles present on load | Open Roles & Privileges for any organization | Company Admin (all 8 privileges) and Members (4 privileges) both listed, Role Type "Default" |
| TC-02 | Default role shows View, not Edit | Click the Actions icon on Company Admin or Members | Read-only View dialog opens; no Save/Delete; toggle is disabled |
| TC-03 | Create a valid custom role | Click New Role, enter a unique name, check some privileges, Save | Role appears with Role Type "Custom," those privileges, 0 members, active |
| TC-04 | Create with empty name | New Role, leave name blank, Save | Blocked client-side, inline "required" error |
| TC-05 | Create with too-short/long name | New Role, enter 1 char or 51+ chars | Blocked client-side, inline length error |
| TC-06 | Create with duplicate name | New Role, enter "Members" or another existing custom role's name (any case) | 409, inline "already exists" error, dialog stays open |
| TC-07 | Create with zero privileges checked | New Role, valid name, leave all checkboxes unchecked, Save | Role created with an empty privileges list — not blocked |
| TC-08 | Edit a custom role | Click Edit on a custom row, change name and/or privileges, Save | Table row updates to reflect the new name/privileges |
| TC-09 | Delete a custom role with 0 members | Edit a custom role with no members assigned, click Delete, confirm | Role removed from table |
| TC-10 | Delete blocked when members assigned | Edit a custom role with ≥1 member, open Delete | Delete button disabled, explanation shown, no request sent |
| TC-11 | Toggle opens confirmation | Click the Actions toggle on an active custom role | Confirmation dialog opens; Switch has not moved yet |
| TC-11b | Confirm disables a custom role | Confirm the dialog opened from an active custom role's toggle | Switch flips off, dialog closes, role shows inactive, success toast |
| TC-11c | Cancel leaves status unchanged | Open the toggle confirmation, click Cancel | Dialog closes, Switch/status unchanged |
| TC-12 | Toggle failure keeps dialog open | Confirm the dialog while the backend request fails | Dialog stays open, error toast shown, Switch unchanged |
| TC-13 | Direct API edit of a default role is rejected | Send `PUT /api/roles/:id` for Company Admin's id | 403, no change |
| TC-14 | Direct API delete of a default role is rejected | Send `DELETE /api/roles/:id` for Members' id | 403, no change |
| TC-15 | Direct API toggle of a default role is rejected | Send `PATCH /api/roles/:id/status` for a default role's id | 403, no change |
| TC-16 | Unknown privilege key rejected | Send create/edit with a `privileges` array containing a key outside the 8 fixed ones | 400, no role created/changed |
| TC-17 | Search filters results | Type a partial role name into Search | Table shows only matching roles (default or custom), re-fetched from page 1 |
| TC-18 | Sort by Role Type | Click the "Role Type" column header | Table re-sorts Default/Custom rows accordingly, direction toggles on repeated clicks |
| TC-18b | Defaults pin to top regardless of sort | Sort by Role name descending in an organization with 20+ custom roles | Company Admin and Members are still the first two rows; no custom role appears above them |
| TC-18c | Defaults pin across pages | With enough custom roles to span 2+ pages, load page 2 | Page 2 contains only custom roles — no default role reappears after page 1 |
| TC-19 | Infinite pagination loads more | Scroll to the bottom of a list with more than one page | Next page fetched automatically and appended, no duplicate or missing rows, no button click required |
| TC-20 | View members of a role | Click a Members count > 0 on any role | Dialog opens listing those members' names and emails |
| TC-21 | Members count of 0 | Click a Members count of 0 | No dialog opens (nothing to show) |

## Edge Cases

- **Search + sort + pagination interplay**: changing search or sort always resets to page 1 — a user scrolled deep into page 3 who then searches must not see stale page-3 results mixed with new search results.
- **Race between toggle and delete**: since Delete is only reachable via Edit, a member could be assigned to a custom role between the moment the Edit dialog opens (showing "0 members," Delete enabled) and the moment Delete is confirmed. The backend re-checks `membersCount` at delete time regardless of what the dialog displayed when it opened, and returns 409 if it's grown to ≥1.
- **Organization scoping on direct id access**: `PUT/PATCH/DELETE/GET /api/roles/:id(/...)` must 404 (not 403) if `:id` belongs to a different organization than the caller's active one — 403 is reserved specifically for "this is a default role in *your* organization," not "this isn't your organization's role at all."
- **Default-role protection is enforced server-side, not just hidden in the UI**: the View dialog and disabled toggle prevent the action through the UI, but the backend independently rejects edit/delete/status-change on any role with `isDefault: true`, so a direct API call can't bypass it.
- **Case-only duplicate names**: "Manager" and "manager" are treated as the same name for uniqueness purposes; the originally-entered casing is preserved and displayed as-is.
- **Independent of Grade/Department**: a member's role, grade ([004](./004-grade-management.md)), and department ([005](./005-department-management.md)) are unrelated attributes stored in separate columns — changes to one never affect the others.
- **Deleting an organization's last custom role is fine**: unlike the two default roles, a custom role can always be deleted once it has zero members — there's no "must have at least one custom role" floor.

## Out of Scope

- Assigning a role *to* a member — no UI exists to set `OrganizationMember.roleId` in this story; that belongs to the future Employee Management screen (currently a placeholder per [003](./003-header-navigation.md)). Until that ships, every role other than what the one-time backfill produces (see [Open Questions](#open-questions--assumptions)) will show 0 members in real usage.
- Actually *enforcing* privileges anywhere in the app (gating a page or action based on a member's assigned role's checked privileges) — this story only lets an organization define and manage the roles and their privilege sets; wiring real authorization checks to them is separate, not-yet-scoped work. Every logged-in user can currently reach every screen regardless of role, per [003](./003-header-navigation.md)'s existing "no permission enforcement yet" decision.
- Renaming or modifying the fixed 8-item privilege catalog itself (adding, removing, or relabeling a privilege) — that's a product/code change, not something this screen exposes.
- Creating additional default/system roles beyond Company Admin and Members, or allowing a custom role to be "promoted" to default status.
- Reassigning a role's members to a different role as part of the delete flow (the blocked-delete message tells the user to do this "elsewhere," but no such UI exists yet since Employee Management doesn't exist).
- Bulk actions (bulk delete, bulk enable/disable, CSV import/export of roles).
- Filtering the list by active/inactive status or by Default/Custom type — all roles are shown together in the same table.
- Pagination on the Members dialog — it returns the full member list for a role in one response; revisit if a single role's membership ever grows large enough for this to matter.
- Audit history of role changes (who created/renamed/disabled a role, and when).

## Open Questions / Assumptions

This story mirrors most of [004-grade-management.md](./004-grade-management.md)'s resolved decisions (Delete-inside-Edit-dialog, member-count-blocks-delete-not-toggle, page-number pagination presented as true infinite scroll, no new form/table libraries) with "role" in place of "grade" — including the toggle-requires-confirmation pattern, which this story was built with from the start (Delete already required confirmation, so both destructive-feeling actions on a custom role behave consistently) rather than starting instant/optimistic and being superseded later, the way [004](./004-grade-management.md) was. What's new or different here:

- **Default roles' toggle is disabled, not just their Edit/Delete** — an extension beyond what was literally requested ("view only, can't be edited or deleted" didn't explicitly mention disabling). Resolved this way because Company Admin and Members are structural: every organization is expected to have at least one active admin-equivalent and one active default member-equivalent role for the system to make sense once role enforcement ([Out of Scope](#out-of-scope)) eventually ships. If this reasoning doesn't match actual intent, the fix is narrow — the toggle simply becomes interactive for default rows, its API guard removed, and the "must always stay active" language above deleted.
- **Company Admin and Members always pin to the top of the list — added after initial implementation, at explicit request**: the original spec only said default roles are "searchable/sortable like any other row," which the first implementation took literally (they'd scatter into normal sort position, e.g. alphabetically among custom roles). Changed so the two default rows are computed and sorted as their own group, then placed ahead of the (separately sorted) custom-role group, applied server-side in `listRoles` before pagination — so they consistently land as the first 1–2 rows of page 1 no matter what's sorted, and never reappear on a later page. This is a real behavior addition beyond both the original story and [004](./004-grade-management.md)/[005](./005-department-management.md)'s equivalent screens, which have no such pinning (Grade/Department have no default rows at all).
- **Backfill decision — existing `OrganizationMember.role` values seed real assignments into the new default roles**: at the same migration that creates `roles`/seeds the two defaults per organization, every existing `OrganizationMember` row is also assigned a `roleId`: `role: "owner"` → that organization's Company Admin row, `role: "member"` → that organization's Members row. This is the one place the legacy `role` string and the new `Role` entity touch, and it's a one-time data migration, not an ongoing sync — going forward, nothing keeps `OrganizationMember.role` and `OrganizationMember.roleId` consistent with each other, since [Out of Scope](#out-of-scope) means there's no UI that changes `roleId` yet anyway. This backfill is what makes the Members counts on the two default roles meaningful immediately (mirroring how [002](./002-organization-signup.md) backfilled a default organization and [003](./003-header-navigation.md) backfilled `activeOrganizationId)`, rather than shipping a feature that shows "0 members" everywhere until Employee Management exists.
- **Privileges stored as a Postgres string array column, not a join table**: since the 8-item catalog is fixed and code-defined (not organization-editable, no CRUD for privileges themselves), a `Role.privileges: ARRAY(STRING)` column avoids the overhead of a `Privilege` lookup table + `RolePrivilege` join table for what's effectively a fixed enum. Revisit only if privileges themselves need to become organization-configurable later (not requested here).
- **No new frontend form/table libraries added**: same as [004](./004-grade-management.md)/[005](./005-department-management.md) — no `react-hook-form`/`zod`/`@tanstack/react-table`; the checkbox group is plain controlled `<input type="checkbox">` state, not a separate form library's field array. Implementation should reuse the same `table`/`dialog`/`switch` shadcn primitives [004](./004-grade-management.md)/[005](./005-department-management.md) already need, plus `checkbox` (not needed by either of those stories) — build all three Company Settings CRUD screens together where practical, since they share this much scaffolding.
