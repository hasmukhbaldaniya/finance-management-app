# 008 - Employee Invitation

**Status:** Draft
**Epic:** Employee Management

## Overview

Covers the 4-step **Invite Employee** wizard (Basic Information → Company Access → FF Numbers → Access & Approval) a Company Administrator uses to create a new employee record and send them an invitation to join the platform. This is **Story 1 of 3** in the Employee Management epic — split into its own file, alongside [009-employee-listing.md](./009-employee-listing.md) (Story 2: listing, resend, suspend) and [010-bulk-invite-employees.md](./010-bulk-invite-employees.md) (Story 3: CSV/XLSX bulk invite) — a deliberate exception to this repo's usual "one file per epic" convention (see `README.md`), made because each of the three stories here has its own substantial API and data-model surface and was explicitly requested as a separate file. This story replaces part of the `/company-settings/employees` placeholder page created in [003-header-navigation.md](./003-header-navigation.md).

**Terminology and schema translated to this codebase's existing conventions, not carried over verbatim from the source spec:**
- "Company" → this codebase's existing **Organization** entity ([002-organization-signup.md](./002-organization-signup.md)). No new `companies` table is introduced; every `company_id` in the original spec is `organizationId` against the existing `organizations` table.
- All column names are camelCase (`firstName`, not `first_name`), per `backend/CLAUDE.md`'s existing convention — the source spec's snake_case is a naming style, not a schema decision, and isn't preserved.
- Role/Department/Grade selections reference the **already-built** `roles` ([006](./006-roles-and-privileges-management.md)), `departments` ([005](./005-department-management.md)), and `grades` ([004](./004-grade-management.md)) tables — this story does not redefine them.

**The single biggest architectural decision in this epic, stated up front**: this story introduces a new `Employee` entity, **distinct from `User`**. An admin can create an employee record — name, email, phone, DOB, gender, company access, FF numbers, approvers — entirely before that person has ever logged in or set a password, which `User` can't represent (it requires a `passwordHash`). `Employee` also duplicates some of what `OrganizationMember` already models (an org-scoped person with a role/department/grade). This is a real, load-bearing design tension — not glossed over — see [Open Questions](#open-questions--assumptions) for the resolution and the follow-up work it implies for [004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md)'s existing member-assignment columns.

**Out of scope for all of Story 1**: what happens on the invited employee's side (clicking the invite link, setting a password, completing their own account) — that's the natural next story, structurally similar to [002](./002-organization-signup.md)'s registration wizard but triggered by an invite token instead of self-service signup. These three Employee Management stories only cover the admin side.

---

## Story: Invite Employee — Step 1: Basic Information

**As a** Company Administrator
**I want to** enter a new employee's basic personal details
**So that** I can begin creating their employee record

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Invite Employee – Step 1 | Title | select (Mr / Mrs / Ms) | Yes |
| Invite Employee – Step 1 | First Name | text | Yes |
| Invite Employee – Step 1 | Last Name | text | Yes |
| Invite Employee – Step 1 | Email | text (email) | Yes |
| Invite Employee – Step 1 | Country Code | select | Yes |
| Invite Employee – Step 1 | Contact Number | text (numeric) | Yes |
| Invite Employee – Step 1 | Date of Birth | date | No |
| Invite Employee – Step 1 | Gender | select (Male / Female / Other) | Yes |
| Invite Employee – Step 1 | Employee ID | text | No |
| Invite Employee – Step 1 | Continue button | button | — |
| Invite Employee – Step 1 | "Cancel" link | link → Employee Listing ([009](./009-employee-listing.md)), discards the draft employee record (see Edge Cases) | — |

### Flow

1. Admin clicks **Invite** from the Employee Listing ([009](./009-employee-listing.md)) and lands on Step 1.
2. Admin fills the fields; frontend runs full client-side validation on Continue (see Validation Rules). Invalid fields block submit with inline errors — no API call.
3. On a valid submit, frontend calls the create API.
   - **Success** → backend creates the `Employee` row (`invitationStatus: "Pending"`, `status: "Active"`) and returns its id; frontend holds that id in wizard state and advances to Step 2.
   - **Email already exists** (within this organization) → 409; shown as an inline field error on Email.
   - **Contact Number already exists** (within this organization) → 409; shown as an inline field error on Contact Number.
   - **Employee ID already exists** (within this organization, when provided) → 409; shown as an inline field error on Employee ID.
   - **Unexpected server error** → generic error toast, stays on Step 1.
4. Clicking **Cancel** returns to Employee Listing. If the employee record was already created (i.e., Cancel is clicked from Step 2, 3, or 4, after Step 1 already succeeded), see [Edge Cases](#edge-cases) for what happens to that partial record.

### Validation Rules

| Field | Rule |
|-------|------|
| Title | Required. One of `Mr`, `Mrs`, `Ms`. |
| First Name | Required, 2–50 characters, `^[A-Za-z ]+$` (letters and spaces only). |
| Last Name | Required, 2–50 characters, same pattern as First Name. |
| Email | Required. Standard email format (`^[^\s@]+@[^\s@]+\.[^\s@]+$`). Must be unique within the organization — checked server-side. |
| Country Code + Contact Number | Both required. Contact Number is numeric only, 7–15 digits. The combination must be unique within the organization — checked server-side. |
| Date of Birth | Optional. Cannot be in the future. If provided, the employee must be at least 18 years old as of today. |
| Gender | Required. One of `Male`, `Female`, `Other`. |
| Employee ID | Optional. If provided, max 30 characters, must be unique within the organization — checked server-side. |

### Acceptance Criteria

- **Given** all required fields are valid and Email/Contact Number/Employee ID are unused in this organization, **when** the admin clicks Continue, **then** the employee record is created and the wizard advances to Step 2.
- **Given** an Email already used by another employee in this organization, **when** the admin submits, **then** a 409 is returned and shown inline on the Email field; the wizard stays on Step 1.
- **Given** a Contact Number already used by another employee in this organization, **when** the admin submits, **then** a 409 is returned and shown inline on the Contact Number field.
- **Given** a Date of Birth in the future, **when** the admin attempts to submit, **then** the form is blocked client-side with an inline error.
- **Given** a Date of Birth implying an age under 18, **when** the admin attempts to submit, **then** the form is blocked client-side with an inline error.
- **Given** First or Last Name containing digits or symbols, **when** the admin attempts to submit, **then** the form is blocked client-side with an inline "only alphabets allowed" error.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| First/Last Name required | "First Name is required." / "Last Name is required." |
| First/Last Name invalid | "Only alphabets allowed." |
| Email invalid format | "Enter a valid email address." |
| Email already exists | "This email is already in use." |
| Contact Number invalid | "Enter a valid contact number." |
| Contact Number already exists | "This contact number is already in use." |
| Employee ID already exists | "This Employee ID is already in use." |
| DOB in the future | "Date of birth cannot be in the future." |
| Age under 18 | "Employee must be at least 18 years old." |
| Server/network error | "Something went wrong. Please try again." |

---

## Story: Invite Employee — Step 2: Company Access

**As a** Company Administrator
**I want to** assign the new employee's role, department, grade, and projects
**So that** they have the right access once they join

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Invite Employee – Step 2 | Organization (read-only — always the admin's current active organization) | text | — |
| Invite Employee – Step 2 | Role | select (from [006](./006-roles-and-privileges-management.md)'s Roles) | Yes |
| Invite Employee – Step 2 | Department | select (from [005](./005-department-management.md)'s Departments) | Yes |
| Invite Employee – Step 2 | Grade | select (from [004](./004-grade-management.md)'s Grades) | Yes |
| Invite Employee – Step 2 | Projects | multi-select (from this organization's Projects — see [Data Model](#data-model)) | No |
| Invite Employee – Step 2 | "+ New Project" | link/button → inline-creates a Project (name only) without leaving the wizard, then adds it to the Projects selection | — |
| Invite Employee – Step 2 | Continue button | button | — |
| Invite Employee – Step 2 | "← Back" link | link → Step 1, previously entered values preserved | — |

### Flow

1. Role/Department/Grade/Project pickers are populated from this organization's existing active records only (see Business Rules).
2. Admin selects Role, Department, and Grade (all required) and optionally one or more Projects. Clicking "+ New Project" opens an inline name-only creation control (mirroring [004](./004-grade-management.md)/[005](./005-department-management.md)'s Add dialogs at a smaller scale) that creates the Project scoped to the selected Department and adds it to the current selection immediately.
3. On Continue, frontend validates required selections client-side, then calls the save API with the employee id from Step 1.
   - **Success** → advances to Step 3.
   - **Selected Role/Department/Grade is inactive or no longer exists** → 409/404; inline error naming which field is invalid, picker re-fetched to drop the stale option.
   - **Unexpected server error** → generic error toast, stays on Step 2.
4. **Back** returns to Step 1 with that step's data intact (the employee row already exists by this point — Back does not delete it).

### Validation Rules

| Field | Rule |
|-------|------|
| Role | Required. Must belong to the current organization and be active. |
| Department | Required. Must belong to the current organization and be active. |
| Grade | Required. Must belong to the current organization and be active. |
| Projects | Optional. Each selected project must belong to the selected Department. |

### Business Rules

- Role, Department, and Grade must all belong to the same organization as the employee being invited (never cross-organization).
- Every selected Project must belong to the selected Department — selecting a project from a different department is rejected.

### Acceptance Criteria

- **Given** an active Role, Department, and Grade all belonging to this organization, **when** the admin clicks Continue, **then** the selections are saved and the wizard advances to Step 3.
- **Given** no Role, Department, or Grade selected, **when** the admin attempts to submit, **then** the form is blocked client-side with inline "required" errors.
- **Given** a Project that doesn't belong to the selected Department, **when** the admin attempts to select it, **then** it isn't offered in the Projects picker (the picker itself is scoped to the selected Department, so this can't be attempted through the UI).
- **Given** the admin clicks "+ New Project" and enters a valid name, **when** they submit it, **then** the new project is created under the selected Department and immediately available/selected in the Projects picker.
- **Given** a Role/Department/Grade that was deleted or disabled between opening the picker and submitting, **when** the admin submits, **then** the backend rejects it and the picker refreshes to remove the stale option.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Role/Department/Grade required | "Please select a {field}." |
| Selected Role/Department/Grade no longer valid | "This {field} is no longer available. Please choose another." |
| Server/network error | "Something went wrong. Please try again." |

---

## Story: Invite Employee — Step 3: FF Numbers

**As a** Company Administrator
**I want to** record the employee's frequent-flyer numbers
**So that** their airline loyalty details are on file for trip bookings

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Invite Employee – Step 3 | Airline | select (from a fixed airline reference list — see [Data Model](#data-model)) | Yes, per row |
| Invite Employee – Step 3 | FF Number | text | Yes, per row |
| Invite Employee – Step 3 | "+ Add another" | button → adds another Airline/FF Number row | — |
| Invite Employee – Step 3 | Remove (per row) | icon button → removes that row | — |
| Invite Employee – Step 3 | Continue button | button | — |
| Invite Employee – Step 3 | Skip | button → advances to Step 4 without saving any FF numbers | — |
| Invite Employee – Step 3 | "← Back" link | link → Step 2, previously entered values preserved | — |

### Flow

1. This step is entirely optional at the wizard level — **Skip** advances to Step 4 with zero FF numbers recorded. Adding at least one row makes Continue behave the same as Skip except it also saves the row(s).
2. Admin can add multiple Airline/FF Number rows; each row validates independently. Removing a row before submit simply discards it (no API call for a row that's removed before Continue).
3. On Continue with one or more rows, frontend validates each row client-side, then calls the save API with the full set of rows for this employee.
   - **Success** → advances to Step 4.
   - **Duplicate airline within the submitted set** → blocked client-side before any API call (see Validation Rules).
   - **Unexpected server error** → generic error toast, stays on Step 3 with all entered rows intact.

### Validation Rules

| Field | Rule |
|-------|------|
| Airline | Required (per row). Must be one of the fixed reference airlines. |
| FF Number | Required (per row). Max 30 characters. |
| Airline (across rows) | No two rows in the same submission may use the same Airline. |

### Acceptance Criteria

- **Given** zero rows, **when** the admin clicks Skip, **then** the wizard advances to Step 4 with no FF numbers saved.
- **Given** one or more valid, non-duplicate-airline rows, **when** the admin clicks Continue, **then** all rows are saved and the wizard advances to Step 4.
- **Given** two rows using the same Airline, **when** the admin attempts to submit, **then** the form is blocked client-side with an inline "this airline is already added" error on the second row.
- **Given** a row with a blank Airline or FF Number, **when** the admin attempts to submit, **then** the form is blocked client-side with inline "required" errors on that row.
- **Given** the admin clicks Remove on a row, **when** it's removed, **then** that row disappears from the form with no API call made for it.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Airline required | "Please select an airline." |
| FF Number required | "FF Number is required." |
| Duplicate airline in the same submission | "This airline has already been added." |
| Server/network error | "Something went wrong. Please try again." |

---

## Story: Invite Employee — Step 4: Access & Approval

**As a** Company Administrator
**I want to** grant module access and assign approvers for the new employee
**So that** their claims/trips flow to the right people once submitted

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Invite Employee – Step 4 | Module Access (per module the employee can use — e.g. Trips, Claims) | checkbox group | No |
| Invite Employee – Step 4 | Approver — Level 1 | select (from this organization's active employees) | Yes |
| Invite Employee – Step 4 | Approver — Level 2 | select | No |
| Invite Employee – Step 4 | "+ Add approver level" | button → adds Level N | — |
| Invite Employee – Step 4 | "Send Invite" button | button (terminal action of the wizard) | — |
| Invite Employee – Step 4 | "← Back" link | link → Step 3, previously entered values preserved | — |

### Flow

1. Admin optionally checks which modules this employee can access, and assigns at least one approver (Level 1 is mandatory; additional levels are optional and added one at a time via "+ Add approver level").
2. On **Send Invite**, frontend validates approver selections client-side (see Business Rules/Validation), then:
   a. Calls the save-approvals API with the employee id and the full approver-level list.
   b. On success, immediately calls the send-invite API for the same employee, which emails the invite and marks the wizard complete.
3. **Success** (both calls succeed) → success toast ("Invitation sent."), wizard closes, admin is returned to Employee Listing ([009](./009-employee-listing.md)) where the new employee now appears with Invitation Status "Pending."
4. **Approver validation failure** (e.g. an approver was suspended between selection and submit) → inline error identifying the affected level; approvals not saved, invite not sent.
5. **Unexpected server error on either call** → generic error toast; if approvals saved but the invite-send call failed, the employee record still exists with approvals set and `invitationStatus: "Pending"` — the admin can send the invite later via Resend Invitation ([009](./009-employee-listing.md)), since (per that story) Resend is available to any Pending employee, not only ones whose very first send failed.

### Validation Rules

| Field | Rule |
|-------|------|
| Approver — Level 1 | Required. Must be an active employee in this organization, and cannot be the employee currently being invited (no self-approval). |
| Approver — any level | Cannot be the same employee as any other level in this same submission (no duplicate approver across levels). Must be an active employee belonging to this organization. |

### Business Rules

- An employee cannot be their own approver at any level.
- The same person cannot be assigned to more than one approval level for the same employee/module.
- Every approver must belong to the same organization as the employee being invited, and must currently be `Active` (not suspended).

### Acceptance Criteria

- **Given** a valid, active Level 1 approver who isn't the employee themselves, **when** the admin clicks Send Invite, **then** the approval configuration is saved, the invite email is sent, and the admin returns to Employee Listing with the new employee shown as "Pending."
- **Given** no Level 1 approver selected, **when** the admin attempts to submit, **then** the form is blocked client-side with an inline "at least one approver is required" error.
- **Given** the same person selected for both Level 1 and Level 2, **when** the admin attempts to submit, **then** the form is blocked client-side with an inline "duplicate approver" error.
- **Given** the employee being invited selected as their own approver, **when** the admin attempts to submit, **then** the form is blocked client-side with an inline error.
- **Given** an approver who is suspended or has been deleted by the time of submission, **when** the backend processes the request, **then** it's rejected with an inline error naming the affected level, and neither approvals nor the invite are saved/sent.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| No approver selected | "At least one approver is required." |
| Duplicate approver across levels | "Each approval level must have a different approver." |
| Self-approval attempted | "An employee cannot approve their own requests." |
| Approver suspended/inactive | "The selected approver for Level {N} is no longer active." |
| Invitation sent | "Invitation sent." |
| Server/network error | "Something went wrong. Please try again." |

---

## API Design

All endpoints are authenticated (session cookie via `requireAuth`) and scoped to the caller's current active organization (`User.activeOrganizationId`).

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| POST | `/api/employees` | `{ title, firstName, lastName, email, countryCode, contactNumber, dob, gender, employeeCode }` | `{ id }` (201) |
| PUT | `/api/employees/:id/company-access` | `{ roleId, departmentId, gradeId, projectIds: number[] }` | `{ message }` |
| POST | `/api/employees/:id/ff-numbers` | `{ ffNumbers: [{ airlineId, ffNumber }] }` | `{ message }` |
| POST | `/api/employees/:id/approvals` | `{ moduleAccess: string[], approvers: [{ level, approverEmployeeId }] }` | `{ message }` |
| POST | `/api/employees/:id/send-invite` | — | `{ message }` (sends the invite email; also used the first time, not just for resends) |
| GET | `/api/employees` | — | `{ employees: [{ id, firstName, lastName, email }] }` (added during implementation, not in the original table — see [Open Questions](#open-questions--assumptions); a minimal unpaginated active-employee list, scoped only to populating Step 4's approver picker) |
| POST | `/api/projects` | `{ departmentId, name }` (the "+ New Project" inline-create action) | `{ project: { id, name, departmentId, isActive } }` (201) |
| GET | `/api/projects?departmentId=` | — | `{ projects: [{ id, name, departmentId, isActive }] }` (added during implementation — see [Open Questions](#open-questions--assumptions); populates Step 2's Projects picker) |
| GET | `/api/airlines` | — | `{ airlines: [{ id, name }] }` (added during implementation — see [Open Questions](#open-questions--assumptions); populates Step 3's Airline picker) |

Error responses follow the existing convention (`{ error: string }`): 400 (validation), 401 (no session), 404 (referenced role/department/grade/project/approver/employee doesn't belong to the caller's organization or doesn't exist), 409 (duplicate email/contact number/employee ID), 500 (unexpected).

## Data Model

- New `Employee` table: `id`, `organizationId` (FK → `organizations`), `title`, `firstName`, `lastName`, `email`, `countryCode`, `contactNumber`, `dob` (nullable), `gender`, `employeeCode` (nullable), `status` (`"active" | "suspended"`, default `"active"`), `invitationStatus` (`"pending" | "registered"`, default `"pending"`), `userId` (nullable FK → `users` — set once the employee accepts their invite and a real login account exists; entirely out of scope to populate in this story), `createdBy`/`updatedBy` (FK → `users`), `createdAt`/`updatedAt`. Unique indexes on `(organizationId, email)` and `(organizationId, countryCode, contactNumber)`; unique on `(organizationId, employeeCode)` where `employeeCode` is not null.
- New `EmployeeCompanyAccess` table: `id`, `employeeId` (FK → `employees`), `organizationId` (FK → `organizations`, redundant with `Employee.organizationId` but kept for query convenience and to allow — in a later story, not this one — an employee to have access rows in more than one organization), `roleId` (FK → `roles`), `departmentId` (FK → `departments`), `gradeId` (FK → `grades`), `createdAt`/`updatedAt`.
- New `Project` table: `id`, `organizationId` (FK → `organizations`), `departmentId` (FK → `departments`), `name`, `isActive` (boolean, default `true`), `createdAt`/`updatedAt`. Minimal by design — this story only needs inline create-by-name from the wizard's "+ New Project," not a full CRUD screen (that's a plausible future story, mirroring [004](./004-grade-management.md)/[005](./005-department-management.md), but isn't this one).
- New `EmployeeProject` join table: `id`, `employeeId` (FK → `employees`), `projectId` (FK → `projects`), `createdAt`.
- New `Airline` table (global, not organization-scoped): `id`, `name`. Seeded with a fixed reference list; no management UI in this epic — see [Open Questions](#open-questions--assumptions).
- New `EmployeeFfNumber` table: `id`, `employeeId` (FK → `employees`), `airlineId` (FK → `airlines`), `ffNumber`, `createdAt`/`updatedAt`. Unique index on `(employeeId, airlineId)`.
- New `ApprovalLevel` table: `id`, `employeeId` (FK → `employees`, the employee *whose* requests need approval), `module` (string, e.g. `"claims"`, `"trips"`), `level` (integer, 1-based), `approverEmployeeId` (FK → `employees`, who approves at that level), `createdAt`/`updatedAt`. Unique index on `(employeeId, module, level)`.
- New `EmployeeInvite` table (a simple send-log, not a full invite/token model — see [Open Questions](#open-questions--assumptions)): `id`, `employeeId` (FK → `employees`), `sentAt`, `sentBy` (FK → `users`). Used by both this story's first send and [009](./009-employee-listing.md)'s Resend Invitation to enforce the daily rate limit and expiry window.

## Validation Rules Summary

| Field type | Rule |
|------------|------|
| First/Last Name | `^[A-Za-z ]+$`, 2–50 characters |
| Email | Standard email format, unique per organization |
| Contact Number | Numeric, 7–15 digits; `(countryCode, contactNumber)` unique per organization |
| Employee ID | Optional, max 30 characters, unique per organization when provided |
| DOB | Not in the future; implies age ≥ 18 when provided |
| FF Number | Max 30 characters; no duplicate airline within one employee |

## Test Cases

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|------------------|
| TC-01 | Create employee, all valid | Step 1: fill all fields correctly, Continue | Employee created, advances to Step 2 |
| TC-02 | Duplicate email | Step 1: use an email already used in this org | 409, inline error, stays on Step 1 |
| TC-03 | Duplicate contact number | Step 1: use a contact number already used in this org | 409, inline error |
| TC-04 | Future DOB | Step 1: enter a DOB after today | Blocked client-side |
| TC-05 | Underage DOB | Step 1: enter a DOB implying age < 18 | Blocked client-side |
| TC-06 | Invalid name characters | Step 1: enter digits in First Name | Blocked client-side, "only alphabets" error |
| TC-07 | Company Access, all required selected | Step 2: pick active Role/Department/Grade, Continue | Saved, advances to Step 3 |
| TC-08 | Company Access, missing required field | Step 2: leave Grade unselected | Blocked client-side |
| TC-09 | Project outside selected Department | Step 2: attempt to pick a project belonging to a different department | Not offered in the picker |
| TC-10 | Inline "+ New Project" | Step 2: create a new project by name | Project created, selected immediately |
| TC-11 | FF Numbers, skip | Step 3: click Skip with no rows | Advances to Step 4, no FF numbers saved |
| TC-12 | FF Numbers, valid rows | Step 3: add two rows with different airlines, Continue | Both saved, advances to Step 4 |
| TC-13 | FF Numbers, duplicate airline | Step 3: add two rows with the same airline | Blocked client-side |
| TC-14 | Approvals, valid single approver | Step 4: select one active, non-self Level 1 approver, Send Invite | Approvals saved, invite sent, returns to Employee Listing |
| TC-15 | Approvals, no approver selected | Step 4: leave Level 1 blank, Send Invite | Blocked client-side |
| TC-16 | Approvals, self-approval | Step 4: select the invitee themselves as Level 1 | Blocked client-side |
| TC-17 | Approvals, duplicate across levels | Step 4: select the same person for Level 1 and Level 2 | Blocked client-side |
| TC-18 | Approver suspended before submit | Step 4: submit after the selected approver was suspended elsewhere | Backend rejects, inline error, nothing saved |
| TC-19 | Server/network error at any step | Submit valid data while the backend is unreachable | Generic error toast, entered data preserved, stays on the current step |

## Edge Cases

- **Abandoning the wizard after Step 1**: the employee record already exists once Step 1 succeeds (needed so Steps 2–4 have an id to attach to). Clicking Cancel or navigating away after that point leaves a real `Employee` row with `invitationStatus: "pending"` but no company access/approvals set. [009](./009-employee-listing.md)'s listing will show this row like any other Pending employee — there is no separate "draft" state. Completing Company Access ([Step 2](#story-invite-employee--step-2-company-access)) is required before an admin could reasonably send an invite for real use, but nothing in this story technically blocks sending one for an incomplete record; this is flagged rather than silently allowed to go unmentioned.
- **Browser refresh mid-wizard**: the employee id and previously entered step data live in a route-scoped frontend context, same pattern as [002](./002-organization-signup.md)'s registration wizard. A refresh loses that in-memory state; the admin would need to find the partially-created employee in the listing and can only append further steps if a future edit story supports resuming (out of scope here — see [009](./009-employee-listing.md)'s Employee Edit for what's covered instead).
- **Concurrent invite of the same email**: two admins racing to invite the same email address — the second submission's 409 at Step 1 is the defense, identical in shape to how GST/email races are handled in [002](./002-organization-signup.md).
- **Approver deleted between Step 4 load and submit**: covered explicitly in Business Rules/Acceptance Criteria above — the backend re-validates at submit time regardless of what the picker showed when it loaded.

## Out of Scope

- The invited employee's own acceptance flow (invite link, setting a password, completing their profile) — a future story.
- Editing an employee after creation — covered separately in [009-employee-listing.md](./009-employee-listing.md)'s Employee Edit feature.
- A dedicated Projects management screen (list/edit/delete/disable projects) — only inline, name-only creation from Step 2 is in scope here.
- Managing the Airline reference list (adding/removing airlines) — treated as a fixed, seeded catalog for this epic.
- Enforcing Module Access anywhere in the app (gating a page/action based on what was checked in Step 4) — mirrors [006](./006-roles-and-privileges-management.md)'s equivalent "not enforced yet" decision for privileges.
- Rate-limiting or expiring the very first invite send differently from a resend — both use the same underlying send action and the same [009](./009-employee-listing.md)-defined limits.

## Open Questions / Assumptions

- **Superseded after initial implementation: the 4-step wizard navigation was collapsed into a single page**, at explicit request. Every "Screens & Fields"/"Flow" section above still describes the original design (4 separate screens, Continue/Back between them, each step's fields locked behind the previous step's API call succeeding) — that's what got built first, but it's no longer what's live. The actual implementation now renders all 4 sections (Basic Information, Company Access, FF Numbers, Access & Approval) simultaneously on one page (`/company-settings/employees/invite`), every field in every section editable at any time in any order, with a single "Send Invite" button at the bottom instead of per-step Continue buttons. On click, the frontend runs the same 5 API calls this doc always specified (`create` → `company-access` → `ff-numbers`, only if at least one row was filled → `approvals` → `send-invite`) in sequence, client-side — the backend contract is completely unchanged. If a later call in that sequence fails after `create` already succeeded, the already-created employee's id is kept in local state so re-clicking "Send Invite" doesn't re-attempt `create` (which would now 409 on the just-created email). Not rewriting the Screens & Fields/Flow tables above to match, since the API Design and Data Model (the parts that matter for backend/API consumers) are still accurate as written — only the frontend's navigation shell changed.

- **`Employee` vs. `OrganizationMember` — the load-bearing decision of this epic**: `OrganizationMember` (from [002](./002-organization-signup.md)) already represents "a person belongs to this organization" with `role`/`gradeId`/`departmentId`/`roleId` columns added by [003](./003-header-navigation.md)/[004](./004-grade-management.md)/[005](./005-department-management.md)/[006](./006-roles-and-privileges-management.md). This story's `Employee` (+ `EmployeeCompanyAccess`) is richer — it carries an invitation lifecycle, DOB, gender, employee code, and can exist before any `User` login account does — and is **not** the same row as `OrganizationMember`. Resolved as: `Employee` becomes the intended long-term representation of "a person in an organization" going forward; `OrganizationMember` isn't deleted or migrated by this story (out of scope), but whoever implements this epic should treat reconciling the two (or migrating `Grade`/`Department`/`Role`'s member-assignment FKs from `OrganizationMember` onto `EmployeeCompanyAccess`) as necessary follow-up work, not something this story silently handles. Flagging this clearly so it isn't discovered as a surprise mid-implementation.
- **Invite/accept mechanism is only sketched, not specced**: `EmployeeInvite` is a minimal send-log sufficient for the resend rate-limit/expiry rules [009](./009-employee-listing.md) needs, not a full invite-token model (no token format, no expiry-checking endpoint, no accept-flow schema). The accept-side story (see [Out of Scope](#out-of-scope)) will need to add whatever token mechanism it requires.
- **"Send Invite" reuses the same action as "Resend Invitation"** ([009](./009-employee-listing.md)): there's no functional difference between sending the first invite and resending a later one beyond which `invitationStatus`/history state the employee was already in — a single `POST /api/employees/:id/send-invite` endpoint serves both, avoiding a near-duplicate endpoint.
- **Airline list is a fixed, seeded, global reference table**: not organization-scoped, not user-manageable in this epic — mirrors how [006](./006-roles-and-privileges-management.md)'s privilege catalog is a fixed list rather than editable data.
- **Module Access's exact module list isn't enumerated**: the source spec didn't provide the full set (only referencing modules generically alongside Trips/Claims/Approvals, which already exist as nav placeholders per [003](./003-header-navigation.md)). Assumed to be `["trips", "claims", "approvals", "finance", "reports"]`, matching [003](./003-header-navigation.md)'s existing top-level nav items — confirm before implementation if a different module list was intended.
- **Module Access → `ApprovalLevel` fan-out mechanics, resolved during implementation**: Step 4's UI collects one shared approver chain (Level 1, Level 2+), but `ApprovalLevel`'s schema keys rows by `(employeeId, module, level)`, implying a separate chain per module. Resolved by fanning the single submitted chain out into one `ApprovalLevel` row per `(selected module × level)` combination — e.g. checking Trips and Claims with a single Level 1 approver creates two rows, both `level: 1`, same `approverEmployeeId`, one `module: "trips"` and one `module: "claims"`. If no module is checked, a sentinel `module: "general"` is used instead of silently discarding the approver chain. Verified live: submitting Trips+Claims with one Level 1 approver produced exactly two `approval_levels` rows. Not stored anywhere is a "which modules can this employee access" flag — `moduleAccess` only drives this fan-out, matching this doc's own "Enforcing Module Access... Out of Scope" note.
- **`GET /api/employees`'s scope, resolved during implementation**: added to populate Step 4's approver picker only — it's a minimal, unpaginated list, deliberately **not** intended to satisfy [009](./009-employee-listing.md)'s full searchable/sortable/paginated Employee Listing. That story will need its own endpoint (or a materially extended version of this one), not a reuse of this one as-is.
- **`GET /api/employees` is also privilege-scoped, added after initial implementation at explicit request**: rather than returning every active employee, it's restricted to (a) active employees whose Role carries the "Claim / Trip Approvals" privilege (`claim_trip_approvals` — Company Admin has it by default, Members doesn't, but any custom role granting it also qualifies) and (b) the logged-in admin composing the invite, always, regardless of that filter. (b) surfaces the `Employee`-vs-`User` reconciliation gap this doc already flags above: the admin usually has no `Employee` row of their own. Resolved by finding-or-creating one for them on the fly (`ensureSelfEmployee`) — linked by `userId`, falling back to linking-by-email, and otherwise fabricated with placeholder `title`/`gender`/contact-number values, since `User` doesn't carry those and this row's only job is to make the admin selectable as an approver via the same `approverEmployeeId` FK everyone else uses. Chose this over adding a separate `approverUserId` column/branch on `ApprovalLevel`, since that would be more schema churn for the same outcome.
- **`GET /api/projects` and `GET /api/airlines`, added during implementation**: neither was in this doc's original API Design table (which only specified `POST /api/projects` for inline-create) — both were needed to populate Step 2's Projects picker and Step 3's Airline picker respectively. Added to the API Design table above.
- **Wizard route paths, chosen during implementation**: this doc never specified exact URLs (only "Employee Listing," which doesn't exist yet — [009](./009-employee-listing.md) is unbuilt, only its `ComingSoon` placeholder exists). Implemented as `/company-settings/employees/invite`, `.../invite/company-access`, `.../invite/ff-numbers`, `.../invite/access-approval`.
- **"Invite Employee" entry point, added during implementation**: since [009](./009-employee-listing.md)'s real Employee Listing doesn't exist yet, an "Invite Employee" button was added directly to the still-placeholder `/company-settings/employees` `ComingSoon` page so the wizard is reachable end-to-end. Replace this with the real listing's own Invite action once [009](./009-employee-listing.md) is built — this button is a bridge, not the final home for that action.
