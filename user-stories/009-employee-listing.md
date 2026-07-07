# 009 - Employee Listing

**Status:** Draft
**Epic:** Employee Management

## Overview

Covers the Employee Listing screen — the main landing page for Employee Management (`/company-settings/employees`, replacing the placeholder from [003-header-navigation.md](./003-header-navigation.md)) — plus its two row-level lifecycle actions, **Resend Invitation** and **Suspend/Activate**, bundled into this one file since all three are tightly coupled to the same table (matching how [001-authentication.md](./001-authentication.md) bundles Login and Forgot Password). This is **Story 2 of 3** in the Employee Management epic — see [008-employee-invitation.md](./008-employee-invitation.md) (Story 1: the Invite wizard, which this screen's **Invite** button opens) and [010-bulk-invite-employees.md](./010-bulk-invite-employees.md) (Story 3: CSV/XLSX bulk invite, which this screen's **Bulk Invite** button opens).

This screen operates on the `Employee` entity introduced in [008](./008-employee-invitation.md) — see that story's Overview for the important, explicitly-flagged decision that `Employee` is distinct from `OrganizationMember`.

---

## Story: Employee Listing

**As a** Company Administrator
**I want to** see all employees in my organization, searchable, filterable, and sortable
**So that** I can find and manage them

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Employee Listing | Search (Name, Email, Employee ID, Contact Number) | text | — |
| Employee Listing | Status filter (Active / Suspended / Pending Invitation) | dropdown filter | — |
| Employee Listing | "Invite" button | button → opens the Invite Employee wizard ([008](./008-employee-invitation.md)) | — |
| Employee Listing | "Bulk Invite" button | button → opens Bulk Invite ([010](./010-bulk-invite-employees.md)) | — |
| Employee Listing | "Export" button | button → downloads the current filtered/sorted list as a file (see [Out of Scope](#out-of-scope) for format) | — |
| Employee Listing | Employee table (columns below) | table | — |

**Table columns:**

| Column | Content | Sortable |
|--------|---------|----------|
| Employee Name | `firstName` + `lastName` | Yes |
| Email | — | Yes |
| Role | This employee's `EmployeeCompanyAccess.roleId` name ([006](./006-roles-and-privileges-management.md)) | Yes |
| Department | This employee's `EmployeeCompanyAccess.departmentId` name ([005](./005-department-management.md)) | Yes |
| Contact Number | `countryCode` + `contactNumber` | Yes |
| Invitation Status | "Pending" or "Registered" | Yes |
| Employee Status | "Active" or "Suspended" | Yes |
| Actions | Resend Invite (Pending only), Edit, Suspend/Activate | No |

**Status filter values are a combined view over two underlying fields** (`Employee.status` and `Employee.invitationStatus`): "Pending Invitation" means `invitationStatus = "pending"` regardless of `status`; "Active"/"Suspended" reflect `status` and only apply once `invitationStatus = "registered"`. This mirrors the same combined-status framing the Invitation Status and Employee Status columns show side by side, and is called out explicitly since the two underlying fields aren't the same thing (see [008](./008-employee-invitation.md)'s Data Model).

### Flow

1. On load, the screen fetches the first page of the current organization's employees (default sort: Employee Name, ascending).
2. **Search**: typing in the search box (debounced) re-queries the list filtered across Name, Email, Employee ID, and Contact Number (server-side, case-insensitive substring match on each). Resets to page 1.
3. **Status filter**: selecting one or more of Active/Suspended/Pending Invitation re-queries the list restricted to those combined-status values (see above). Resets to page 1.
4. **Sorting**: clicking any sortable column header toggles that column's sort direction and re-queries from page 1. Only one column sorted at a time.
5. **Pagination**: default page size 20, loaded via the same append-on-scroll pattern as [004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md).
6. **Empty state**: if the organization has zero employees (or zero match the current search/filter), the table shows "No Employees Found" instead of an empty grid.
7. **Loading state**: a loader is shown while the initial page (or a filter/sort/search change) is in flight.
8. Row actions: **Resend Invite** (only enabled for Pending employees — see the Resend Invitation story below), **Edit** (opens an edit form pre-filled with this employee's data — same fields as [008](./008-employee-invitation.md)'s 4 steps, collapsed into one editable screen; full spec of the edit screen's own flow/validation is deferred to implementation time since it reuses [008](./008-employee-invitation.md)'s field-level rules verbatim), **Suspend/Activate** (see the Suspend/Activate story below).

### Validation Rules

| Field | Rule |
|-------|------|
| Search | Max 100 characters. |

### Acceptance Criteria

- **Given** the organization has employees, **when** the page loads, **then** `GET /api/employees?page=1&pageSize=20` is called and the results render in the table.
- **Given** the request is in flight, **when** the page loads or a filter/sort/search changes, **then** a loading indicator is shown.
- **Given** zero employees match the current search/filter, **when** the request resolves, **then** "No Employees Found" is shown instead of an empty table.
- **Given** a column other than Actions, **when** its header is clicked, **then** the table re-sorts by that column, direction toggling on repeated clicks.
- **Given** the user types a query into Search, **when** the debounce elapses, **then** the table shows only employees matching that query across Name/Email/Employee ID/Contact Number.
- **Given** the user selects one or more Status filter values, **then** the table shows only employees matching those combined-status values.
- **Given** an unauthenticated or expired-session request, **when** `GET /api/employees` is called, **then** the backend returns 401.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Empty result | "No Employees Found" |
| Server/network error (load) | "Something went wrong. Please try again." |

---

## Story: Resend Invitation

**As a** Company Administrator
**I want to** resend an invitation to an employee who hasn't yet accepted it
**So that** they can still join if the original invite was missed or expired

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Employee Listing → row Actions | Resend Invite (visible/enabled only when Invitation Status = Pending) | button | — |

### Flow

1. Clicking Resend Invite on a Pending employee's row calls the resend API for that employee's id — no confirmation dialog (a low-risk, reversible action).
2. **Success** → success toast; the underlying send-log entry ([008](./008-employee-invitation.md)'s `EmployeeInvite`) is updated, resetting the expiry window. A resend mints a **brand-new** onboarding link superseding the previous one — see [011-employee-onboarding.md](./011-employee-onboarding.md) for what's actually in the email and what happens when the employee clicks it.
3. **Already registered** (invitation was accepted between the row rendering and the click — a race) → error toast, row refreshes to reflect the current (no longer Pending) status; the button disappears.
4. **Daily limit reached** (5 sends — first send + resends combined — for this employee in the current day) → error toast naming the limit; no email sent.
5. **Send failure** (e.g. SMTP failure, invalid/bounced email) → error toast; `invitationStatus` remains `"pending"`, admin may retry.

### Validation Rules

| Field | Rule |
|-------|------|
| Target employee | Must currently have `invitationStatus: "pending"`. |
| Rate limit | Maximum 5 sends (first invite + resends combined) per employee per calendar day. |

### Acceptance Criteria

- **Given** a Pending employee, **when** the admin clicks Resend Invite, **then** a new invite email is sent and a success toast is shown.
- **Given** an employee who has already registered, **when** a resend is attempted (e.g. a stale row), **then** the backend rejects it and the row updates to reflect their real, current status.
- **Given** an employee who has already received 5 sends today, **when** the admin attempts another resend, **then** the backend rejects it with a rate-limit error and no email is sent.
- **Given** an SMTP or network failure while sending, **when** the resend is attempted, **then** an error toast is shown and the employee's status remains unchanged (still eligible to retry).

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Resend succeeded | "Invitation resent." |
| Already registered | "This employee has already accepted their invitation." |
| Daily limit reached | "This employee has reached today's invitation limit (5). Please try again tomorrow." |
| Send failure (SMTP/bounce) | "Something went wrong sending the invitation. Please try again." |

---

## Story: Suspend / Activate Employee

**As a** Company Administrator
**I want to** suspend an employee's access, or reinstate a suspended one
**So that** I can control who can currently use the platform without deleting their record

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Employee Listing → row Actions | Suspend / Activate toggle | button/switch | — |
| Confirmation dialog | "Suspend Employee?" with Cancel / Confirm | dialog | — |

### Flow

1. Clicking Suspend on an Active employee's row opens a confirmation dialog ("Suspend Employee? — Cancel / Confirm"). Activating a Suspended employee's row does **not** require confirmation (re-enabling access is the lower-risk direction, consistent with [004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md)'s toggles never requiring confirmation) — only the Suspend direction does, since it's the destructive-feeling one and the source spec explicitly calls for a confirmation step there.
2. Confirming Suspend (or clicking Activate directly) calls the status-update API.
   - **Success** → row updates to the new status immediately; success toast.
   - **Blocked** (see Business Rules) → error toast naming why, row unchanged.
   - **Unexpected server error** → generic error toast, row unchanged.

### Business Rules

- An admin cannot suspend their own employee record.
- The last remaining **Active** employee holding the "Company Admin" role ([006](./006-roles-and-privileges-management.md)'s default role) in this organization cannot be suspended — every organization must always retain at least one active Company Admin. (The source spec separately named "Super Admin" as un-suspendable; no such role exists anywhere else in this codebase, so this is treated as the same rule as the Company Admin one, not a second, distinct rule — see [Open Questions](#open-questions--assumptions).)

### Acceptance Criteria

- **Given** an Active employee who is not the current admin and not the organization's last active Company Admin, **when** the admin confirms Suspend, **then** that employee's status becomes Suspended.
- **Given** the admin's own employee record, **when** they attempt to suspend it, **then** the request is rejected and an error toast is shown.
- **Given** the organization's only currently-active Company Admin, **when** anyone attempts to suspend them, **then** the request is rejected and an error toast is shown.
- **Given** a Suspended employee, **when** the admin clicks Activate, **then** their status becomes Active immediately, with no confirmation dialog.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Suspend confirmation prompt | "Suspend Employee?" |
| Attempted self-suspension | "You cannot suspend your own account." |
| Attempted suspension of the last active Company Admin | "This organization must have at least one active Company Admin." |
| Suspended successfully | "Employee suspended." |
| Activated successfully | "Employee activated." |
| Server/network error | "Something went wrong. Please try again." |

---

## API Design

All endpoints are authenticated (session cookie via `requireAuth`) and scoped to the caller's current active organization.

| Method | Path | Body / Query | Response (success) |
|--------|------|---------------|---------------------|
| GET | `/api/employees?search=&status=&sortBy=&sortDir=&page=&pageSize=` | — (query params; `status` accepts comma-separated values from `active`/`suspended`/`pending`; defaults: no search/filter, `sortBy=firstName`, `sortDir=asc`, `page=1`, `pageSize=20`) | `{ employees: [{ id, firstName, lastName, email, role, department, countryCode, contactNumber, invitationStatus, status }], hasMore: boolean }` |
| POST | `/api/employees/:id/resend` | — | `{ message }` |
| PATCH | `/api/employees/:id/status` | `{ status: "active" \| "suspended" }` | `{ employee: { id, status } }` |

Error responses follow the existing convention (`{ error: string }`): 400 (validation, e.g. malformed status value), 401 (no session), 403 (self-suspend or last-Company-Admin-suspend attempted), 404 (`:id` doesn't belong to the caller's organization or doesn't exist), 409 (resend on an already-registered employee), 429 (resend daily limit reached), 500 (unexpected).

## Data Model

No new tables — this story reads and updates the `Employee` table (and its `EmployeeCompanyAccess`/`EmployeeInvite` relations) defined in [008-employee-invitation.md](./008-employee-invitation.md).

## Validation Rules Summary

| Field type | Rule |
|------------|------|
| Search | Max 100 characters |
| Resend rate limit | Max 5 sends per employee per calendar day |

## Test Cases

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|------------------|
| TC-01 | Load page | Open Employee Listing | Employee list displayed |
| TC-02 | Empty response | Load listing for an organization with zero employees | "No Employees Found" shown |
| TC-03 | Invalid/expired token | Load listing without a valid session | 401 |
| TC-04 | Large dataset pagination | Load an organization with 100+ employees, scroll | Pagination/infinite-scroll works, no duplicate/missing rows |
| TC-05 | Search | Search by a partial name | Correct matching records returned |
| TC-06 | Search by email/employee ID/contact number | Search using each of the other three fields | Matching records returned for each |
| TC-07 | Sort by any column | Click each sortable column header | Table re-sorts correctly, direction toggles |
| TC-08 | Filter by status | Select "Pending Invitation" | Only Pending employees shown |
| TC-09 | Resend on Pending employee | Click Resend Invite on a Pending row | Success toast, invite resent |
| TC-10 | Resend on already-registered employee | Attempt resend on a stale Pending row that has since registered | 409, row refreshes |
| TC-11 | Resend rate limit | Attempt a 6th send in one day for the same employee | 429, rate-limit error shown |
| TC-12 | Suspend an eligible employee | Suspend an Active, non-self, non-last-admin employee, confirm | Status becomes Suspended |
| TC-13 | Attempt self-suspend | Attempt to suspend your own employee record | Rejected, error toast |
| TC-14 | Attempt to suspend the last Company Admin | Attempt to suspend the only active Company Admin | Rejected, error toast |
| TC-15 | Activate a suspended employee | Click Activate on a Suspended row | Status becomes Active immediately, no confirmation |

## Edge Cases

- **Duplicate employee**: prevented at creation time ([008](./008-employee-invitation.md)'s email/contact-number/employee-code uniqueness checks) — this listing has no dedup logic of its own, it just reflects what exists.
- **Deleted department/role/grade referenced by an employee's `EmployeeCompanyAccess`**: the Role/Department columns should show a clear "—" or "Unassigned" rather than blank/broken text if the referenced record was deleted (foreign keys are `SET NULL`-style per [004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md)'s own `onDelete` conventions).
- **Employee without a phone number**: contact number is required at creation per [008](./008-employee-invitation.md), so this shouldn't occur through normal use — the column should render gracefully (not crash) if it's ever null regardless.
- **Organization inactive/disabled**: out of scope for this story — no concept of disabling an entire organization exists elsewhere in this codebase yet.
- **API failure mid-load**: the table shows a retry affordance, same pattern as the Dashboard's existing load-error state.
- **Search + filter + sort + pagination interplay**: identical rule to [004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md) — changing search, filter, or sort always resets to page 1.

## Out of Scope

- The full Employee Edit screen's own field-by-field flow/validation spec — it reuses [008](./008-employee-invitation.md)'s Basic Information/Company Access/FF Numbers/Access & Approval field rules verbatim, collapsed into one editable form instead of a 4-step wizard; a dedicated write-up is left for implementation time rather than duplicating [008](./008-employee-invitation.md)'s content here.
- Export file format/columns (CSV vs. XLSX, which columns) — the button is specced as present; its output format is an implementation detail deferred here, similar to how [010](./010-bulk-invite-employees.md)'s template format is fully specced but this button's export format is not, since it wasn't detailed in the source request.
- Deleting an employee record entirely — only Suspend/Activate (a reversible status change) is available; there is no permanent removal.
- Audit logging UI (viewing the audit trail itself) — write-side audit logging is expected per [008](./008-employee-invitation.md)/[010](./010-bulk-invite-employees.md)'s Business Rules, but a screen to browse that log is not specced in any of these three stories.

## Open Questions / Assumptions

- **"Super Admin" is treated as the same concept as "Company Admin," not a second role**: the source spec separately listed "cannot suspend last Company Admin" and "cannot suspend Super Admin" as two rules. No "Super Admin" concept exists anywhere else in this codebase — [006](./006-roles-and-privileges-management.md) only defines "Company Admin" and "Members" as default roles. Resolved as one unified rule (protect the last active Company Admin) rather than inventing a new, otherwise-unused role tier. If "Super Admin" was meant to be a genuine platform-level role (outside any single organization), that's separate, unscoped work.
- **Combined Status filter/column semantics** (documented inline above in the Screens & Fields section) is a resolved interpretation of the source spec listing "Active / Suspended / Pending Invitation" as one filter's options despite `status` and `invitationStatus` being two separate underlying fields.
- **The logged-in caller's own record is excluded from the listing entirely**, added at explicit request beyond this doc's original spec: an admin manages their own account elsewhere (profile, not this table), so `GET /api/employees` always filters out `req.userId`. This wasn't in the original Acceptance Criteria/Test Cases above — those are unchanged and still accurate for every *other* employee's row.
- **`GET /api/employees` moved the approver picker (008) to `GET /api/employees/approvers`**: this doc's own API Design table specs `GET /api/employees` as the main listing, but 008's already-shipped picker was mounted at that exact path first. Rather than overload one endpoint with two materially different response shapes (rich/paginated vs. minimal/unpaginated), the picker moved to `/employees/approvers` and the main path became this story's listing, matching the table as written. 008's frontend call site (`getEmployeesForPicker`) was updated to the new path; no behavior change for that feature.
- **The last-Company-Admin business rule checks `EmployeeCompanyAccess.roleId`, not `Employee.isOwner`**, per this doc's own literal wording ("last remaining Active employee holding the 'Company Admin' role"). A real, known consequence: employees who predate [008](./008-employee-invitation.md)'s invite wizard (migrated in by the User → Employee merge, see `backend/CLAUDE.md`) have no `EmployeeCompanyAccess` row at all, so they don't count toward this rule even though they're `isOwner: true`. This is the same `OrganizationMember`/`EmployeeCompanyAccess` reconciliation gap [008](./008-employee-invitation.md)'s Open Questions already flagged as follow-up work — not a new gap introduced here, just its first concrete behavioral consequence.
- **Export and Bulk Invite buttons, resolved during implementation**: Bulk Invite is omitted from the listing entirely — [010](./010-bulk-invite-employees.md) doesn't exist yet, so there's nowhere for it to link; adding a dead-end button seemed worse than omitting it until that story ships. Export is implemented as a simple client-side CSV download of the current filtered/sorted result set (fetched via one large-`pageSize` request, not a server export endpoint — none was specced) — a reasonable, self-contained reading of "downloads the current filtered/sorted list," matching this doc's own "Out of Scope" note that the exact format was left undecided.
- **Edit's implementation, deferred by this doc to implementation time, is now built**: `company-settings/employees/[id]/edit/page.tsx` reuses [008](./008-employee-invitation.md)'s Invite Employee page verbatim (same sections, same validation, same components) but pre-filled from a new `GET /api/employees/:id` endpoint and updating instead of creating via a new `PATCH /api/employees/:id` (basic info) alongside 008's existing `PUT .../company-access`/`POST .../ff-numbers`/`POST .../approvals` (already update-capable via their replace-not-append design). There's no "Send Invite" step on this page — Resend Invitation stays a separate, standalone row action.
- **A real, unrelated bug was found and fixed while implementing Edit**: `createEmployee` (008) still checked email/contact-number uniqueness scoped to `organizationId`, left over from before the User → Employee merge made those columns globally unique. Fixed to check globally, matching `updateEmployeeBasicInfo`'s (this story's) correct version and the actual DB constraint.
- **Filter UI redesigned to match [007](./007-associated-organizations-network.md)'s Associated Organizations pattern, at explicit request, replacing the single combined `search` box + multi-select dropdown built first**: a funnel/X toggle opens a per-column filter row inside the table header — debounced text inputs under Employee Name (also matching Employee ID/`employeeCode`, which has no dedicated column of its own), Email, and Contact Number, plus a single-select native dropdown under Employee Status (Active/Suspended/Pending Invitation). This replaces the single `search` param this doc's own API Design table specifies with three separate params (`name`/`email`/`contactNumber`) — the backend contract changed to match, same as `007`'s controller already does for its four text columns. Sorting is unaffected — still every column per this doc's original spec, unlike Associated Organizations' 2-of-7 (matching that page's pattern was about the filter row's interaction style, not a reason to also narrow which columns sort).
- **A real bug was found and fixed in this listing's empty-state rendering, copied from [007](./007-associated-organizations-network.md)'s reference page**: the empty check originally swapped out the whole `<Table>` (header + open filter row included) for a bare "No Employees Found" line, so narrowing a filter down to zero matches made the filter inputs themselves disappear mid-interaction. Fixed by moving the empty check into `TableBody` — a single row spanning every column — so the header and any open filter row always stay visible regardless of result count. `007`'s Associated Organizations page has this exact same latent issue (same copied pattern) and was not fixed as part of this story, since it wasn't asked for — flagging it here since it's the same root cause.
