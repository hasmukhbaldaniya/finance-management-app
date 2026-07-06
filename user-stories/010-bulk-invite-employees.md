# 010 - Bulk Invite Employees

**Status:** Draft
**Epic:** Employee Management
**Story ID:** EMP-BULK-001
**Priority:** High
**Actor:** Company Administrator

## Overview

Covers uploading a CSV/XLSX file of multiple employee records so a Company Administrator can create or update many employees at once instead of using the single-employee wizard ([008-employee-invitation.md](./008-employee-invitation.md)) one at a time. This is **Story 3 of 3** in the Employee Management epic — see [008](./008-employee-invitation.md) (Story 1: the Invite wizard and the `Employee`/`EmployeeCompanyAccess`/`Project`/`Airline` data model this story also writes to) and [009-employee-listing.md](./009-employee-listing.md) (Story 2: the listing this screen's "Bulk Invite" button is opened from, and where uploaded employees subsequently appear as Pending). Reuses the `Employee` entity and organization-scoped `Role`/`Department`/`Grade`/`Project` lookups defined there rather than introducing a parallel schema.

**Business value**: reduces manual per-employee data entry, speeds up onboarding a whole team at once, supports bulk migration from another system, and validates data thoroughly before anything is saved — partial success is allowed (good rows are saved even if some rows in the same file fail).

**Terminology note**, same as [008](./008-employee-invitation.md): "Company" in the source spec maps to this codebase's existing **Organization** entity; no new `companies` table exists.

---

## Story: Bulk Invite Employees

**As a** Company Administrator
**I want to** upload a CSV/XLSX file containing multiple employee records
**So that** I can quickly create or update employees without entering each one individually

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Bulk Invite Employees | "Download Sample File" button | button → downloads the template | — |
| Bulk Invite Employees | Upload control ("Choose File") | file input (`.csv`, `.xlsx`; max 10 MB) | Yes |
| Bulk Invite Employees | Information note (see Flow step 1) | static text | — |
| Bulk Invite Employees | "Select File" / re-select | button | — |
| Bulk Invite Employees | Validation summary (Total / Success / Failed / Updated / New Employees) | read-only summary panel, shown after upload validates | — |
| Bulk Invite Employees | "Download Error Report" | button, shown only if any rows failed | — |
| Bulk Invite Employees | "Invite" button | button — confirms the import after a successful validation pass | — |
| Bulk Invite Employees | "Cancel" button | button → discards the upload, returns to Employee Listing ([009](./009-employee-listing.md)) | — |

### Flow

1. The screen displays a note beneath the upload control: "Employees will not receive invite emails immediately. Existing employees will be updated. New employees will be created. Use Invite or Resend Invite from Employee Listing." — this is the single most important behavioral difference from [008](./008-employee-invitation.md)'s wizard, where sending the invite is the wizard's own terminal action; here, uploading and confirming the import **never** sends an email by itself.
2. **Download Sample File**: downloads the current template (columns below), including an example row and an instructions sheet.
3. **Select/upload a file**: frontend validates file presence, extension (`.csv`/`.xlsx` only), size (≤ 10 MB), and that it isn't empty, before ever calling the backend. A file already uploaded once this session can't be re-submitted without a page refresh (prevents accidental double-submission of the same file).
4. On a file passing frontend checks, it's uploaded to the backend for row-by-row validation (see Backend Validation). While in flight, the Invite button is disabled and shows "Uploading…".
5. **Validation summary** renders once the backend responds: Total Records, Success, Failed, Updated (existing employees matched), New Employees (to be created). If any rows failed, a **Download Error Report** button appears (row number, employee name, error message per failed row).
6. **Invite** (only meaningful after a successful validation pass with ≥1 valid row): confirms the import — the backend actually creates/updates the valid rows' `Employee` records. New employees get `invitationStatus: "pending"`; existing (matched) employees are updated in place with their `invitationStatus` left unchanged (an update never re-sets a registered employee back to Pending). **No invite emails are sent as part of this step** — sending happens later, one at a time or via Resend, from [009-employee-listing.md](./009-employee-listing.md).
7. **Cancel**: discards the current upload/validation state (nothing has been saved yet, since Invite is the only step that persists anything) and returns to Employee Listing.

### Validation Rules

**Frontend (before any upload request):**

| Check | Rule |
|-------|------|
| File presence | Required. |
| Extension | `.csv` or `.xlsx` only. |
| File size | Max 10 MB. |
| Empty file | Rejected if it contains zero data rows. |
| Duplicate submission | The same file selection can't be uploaded twice without a page refresh in between. |

**Backend, per row (each row validated independently — see Business Rules):**

| Field | Rule |
|-------|------|
| Title, First Name, Last Name, Email, Country Code, Contact Number, Company (Organization), Role, Department, Grade | Required. |
| Email | RFC email format. Duplicate within the same file → row error. Matches an existing employee in this organization → update instead of create (no error). |
| Contact Number | Numeric, 7–15 digits. Duplicate within the same file → row error. Matches an existing employee in this organization → update instead of create (no error). |
| Title | One of `Mr`, `Mrs`, `Ms`; anything else → row error. |
| Gender | One of `Male`, `Female`, `Other`. |
| DOB | Optional. Cannot be in the future; implies age ≥ 18 when provided. |
| Employee ID | Optional. If provided, must be unique within the organization. |
| Company (Organization) | Must exist. |
| Role / Department / Grade | Must exist and belong to the resolved organization. |
| Project | Optional. If provided, must belong to the resolved organization (and, per [008](./008-employee-invitation.md), its selected Department). |

### Business Rules

- Only a Company Administrator can perform a bulk upload (see [Open Questions](#open-questions--assumptions) for how this is checked given no formal permission-enforcement system exists yet).
- Maximum 5,000 employee rows per upload (configurable).
- Maximum file size 10 MB. Accepted MIME types: `text/csv`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- **Matching priority for "is this an existing employee?"**: Email, then Country Code + Contact Number, then Employee ID — the first of these three that matches an existing employee in this organization means "update," otherwise "create."
- A matched employee whose current `status` is `"suspended"` is **not** silently reactivated by a bulk update — the row still updates their other fields, but `status` itself is left untouched by this flow (bulk invite never changes `status`, only [009](./009-employee-listing.md)'s Suspend/Activate does).
- The entire upload never fails as a unit — every row is validated and (if the import is confirmed) processed independently; a bad row doesn't roll back good rows in the same file.
- Invite emails are never sent as a side effect of upload or confirm-import — always a separate, later action via [009-employee-listing.md](./009-employee-listing.md).
- Every create/update performed by a confirmed import is captured in the audit log (upload-level metadata and per-record changes).

### Acceptance Criteria

- **Given** the admin clicks Download Sample File, **when** it downloads, **then** the file contains the required headers, an example row, and an instructions sheet.
- **Given** no file selected, **when** the admin attempts to upload, **then** "Please select a file." is shown and no request is made.
- **Given** a file with an unsupported extension, **when** selected, **then** "Only CSV and XLSX files are supported." is shown and no request is made.
- **Given** a file larger than 10 MB, **when** selected, **then** "Maximum allowed size is 10 MB." is shown and no request is made.
- **Given** a file with zero data rows, **when** uploaded, **then** "Uploaded file contains no records." is shown.
- **Given** a valid file with 100 rows where 95 pass validation and 5 fail, **when** it's uploaded, **then** the summary shows Total 100 / Success 95 / Failed 5, and a Download Error Report button appears.
- **Given** a validated upload with at least one successful row, **when** the admin clicks Invite, **then** the successful rows are saved (created or updated as appropriate) with no invite emails sent, and the summary/confirmation reflects what was saved.
- **Given** a row whose email matches an existing employee in this organization, **when** the import is confirmed, **then** that employee's record is updated, not duplicated, and their `invitationStatus` is unchanged.
- **Given** a row referencing a Company/Role/Department/Grade that doesn't exist, **when** validated, **then** that row is marked failed with a specific error naming which reference is invalid; other rows in the same file are unaffected.
- **Given** the admin clicks Cancel at any point before confirming Invite, **when** they return to Employee Listing, **then** nothing from that upload has been saved.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| No file selected | "Please select a file." |
| Invalid extension | "Only CSV and XLSX files are supported." |
| File too large | "Maximum allowed size is 10 MB." |
| Empty file | "Uploaded file contains no records." |
| Row: invalid email | "Invalid Email." |
| Row: duplicate email in file | "Duplicate Email in uploaded file." |
| Row: invalid contact number | "Invalid Contact Number." |
| Row: duplicate contact number in file | "Duplicate Contact Number." |
| Row: invalid title | "Invalid Title." |
| Row: company not found | "Company not found." |
| Row: department/role/grade/project not found | "Department Not Found." / "Role Not Found." / "Grade Not Found." / "Project Not Found." |
| Row: employee is inactive (matched a deleted employee) | "Employee is inactive." |
| Import confirmed successfully | "Employees imported successfully." |
| Server/network error | "Something went wrong. Please try again." |

---

## Download Sample File

Provides a predefined employee template so column names/order match exactly what the upload validator expects.

| Column | Required |
|--------|----------|
| Title | Yes |
| First Name | Yes |
| Last Name | Yes |
| Email | Yes |
| Country Code | Yes |
| Contact Number | Yes |
| DOB | No |
| Gender | Yes |
| Employee ID | No |
| Company | Yes |
| Role | Yes |
| Department | Yes |
| Grade | Yes |
| Projects | No |

## Upload Summary

Shown after backend validation, before the import is confirmed:

| Status | Count |
|--------|-------|
| Total Records | 100 |
| Success | 95 |
| Failed | 5 |
| Updated | 40 |
| New Employees | 55 |

**Error report format** (available when Failed > 0):

| Row | Employee | Error |
|-----|----------|-------|
| 5 | John | Invalid Email |
| 8 | Steve | Department Not Found |
| 10 | Mark | Duplicate Contact Number |

## Employee Listing Behavior After Import

- **Existing (matched) employee**: fields updated; `invitationStatus` unchanged.
- **New employee**: created with `invitationStatus: "pending"`. Appears in [009-employee-listing.md](./009-employee-listing.md) like any other Pending employee — the admin sends their invite via Invite ([008](./008-employee-invitation.md)'s send-invite action) or Resend Invite ([009](./009-employee-listing.md)) at a time of their choosing.

## API Design

All endpoints are authenticated (session cookie via `requireAuth`), require the caller to be a Company Administrator for their active organization (same enforcement question as [007](./007-associated-organizations-network.md)'s owner-only gating — see [Open Questions](#open-questions--assumptions)), and scoped to that organization.

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| GET | `/api/employees/bulk/template` | — | The template file (`Employee_Template.xlsx`) |
| POST | `/api/employees/bulk/upload` | multipart `file` | `{ uploadId, total, created, updated, failed, errors: [{ row, employeeName, message }] }` |
| POST | `/api/employees/bulk/import` | `{ uploadId }` | `{ total, created, updated, failed }` |
| GET | `/api/employees/bulk/:uploadId/errors` | — | The error report file (row/employee/error columns, matching the table above) |

Error responses follow the existing convention (`{ error: string }`): 400 (file missing/invalid extension/empty/oversized, or `uploadId` not found), 401 (no session), 403 (caller isn't a Company Administrator), 413 (file exceeds size limit, if caught at the transport layer instead of application code), 500 (unexpected).

## Data Model

No new tables for employees themselves — bulk import creates/updates rows in the `Employee`/`EmployeeCompanyAccess` tables defined in [008-employee-invitation.md](./008-employee-invitation.md), through the exact same matching/validation rules. Two new tables track the upload process itself:

- New `BulkUpload` table: `id` (UUID), `organizationId` (FK → `organizations`), `uploadedBy` (FK → `users`), `fileName`, `status` (`"validated" | "imported" | "failed"`), `totalRows`, `successRows`, `failedRows`, `createdAt`.
- New `BulkUploadError` table: `id` (UUID), `uploadId` (FK → `bulk_uploads`), `rowNumber`, `employeeEmail`, `employeeName`, `errorMessage`, `createdAt`.

The uploaded file's parsed rows themselves (pending confirmation) are held server-side keyed by `uploadId` between the `/upload` and `/import` calls — not persisted as `Employee` rows until `/import` is called, consistent with "nothing is saved until Invite is clicked."

## Validation Rules Summary

| Field type | Rule |
|------------|------|
| File | `.csv`/`.xlsx`, ≤ 10 MB, ≤ 5,000 data rows, non-empty |
| Email (per row) | RFC format, unique within the file, matched-or-created against the organization |
| Contact Number (per row) | Numeric, 7–15 digits, unique within the file, matched-or-created against the organization |
| Title (per row) | `Mr` / `Mrs` / `Ms` |
| Gender (per row) | `Male` / `Female` / `Other` |
| DOB (per row) | Optional; not future; implies age ≥ 18 when provided |
| Employee ID (per row) | Optional; unique within the organization when provided |
| Company/Role/Department/Grade/Project (per row) | Must exist and belong to the resolved organization (Project additionally to the resolved Department, per [008](./008-employee-invitation.md)) |

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| BI-001 | Download sample template | Template downloads successfully |
| BI-002 | Upload valid CSV | Validation passes |
| BI-003 | Upload valid XLSX | Validation passes |
| BI-004 | Upload without selecting a file | "Please select a file" error |
| BI-005 | Upload unsupported file type | Validation error |
| BI-006 | Upload file larger than 10 MB | Validation error |
| BI-007 | Upload empty file | Validation error |
| BI-008 | Missing required columns | File rejected |
| BI-009 | Invalid email format | Row marked as failed |
| BI-010 | Duplicate email in uploaded file | Duplicate error shown |
| BI-011 | Duplicate phone number in uploaded file | Duplicate error shown |
| BI-012 | Existing employee in database | Employee updated |
| BI-013 | New employee | Employee created |
| BI-014 | Invalid company (organization) | Row validation error |
| BI-015 | Invalid department | Row validation error |
| BI-016 | Invalid role | Row validation error |
| BI-017 | Invalid grade | Row validation error |
| BI-018 | Future DOB | Validation error |
| BI-019 | Underage employee | Validation error |
| BI-020 | Mixed valid and invalid rows | Successful rows processed; failed rows reported |
| BI-021 | Download error report | Error report generated correctly |
| BI-022 | Unauthorized user (not a Company Administrator) | 403 Forbidden |
| BI-023 | Concurrent uploads by different admins | Both complete independently, no data corruption |
| BI-024 | Retry after network interruption | Upload can be retried without duplicate employee creation |
| BI-025 | Audit log verification | Upload and record-level changes captured in audit logs |

## Edge Cases

| Scenario | Expected Result |
|----------|------------------|
| Empty file | Validation error |
| Wrong extension (e.g. `.pdf`) | Reject upload |
| File larger than 10 MB | Reject upload |
| Missing mandatory column | Reject file |
| Duplicate headers | Reject file |
| Extra unknown columns | Ignored (not treated as an error) |
| Blank mandatory fields | Row validation error |
| Duplicate email in same file | Row validation error |
| Duplicate contact number in same file | Row validation error |
| Invalid email format | Row validation error |
| Invalid phone number | Row validation error |
| Future DOB | Row validation error |
| Age below 18 | Row validation error |
| Company (organization) does not exist | Row validation error |
| Department/Role/Grade/Project not found | Row validation error |
| Employee already exists (matched) | Update existing employee |
| Matched employee is suspended | Other fields updated; `status` itself left untouched by bulk import (see Business Rules) |
| Database timeout during import | Upload marked failed; admin can retry the same file |
| Network interruption mid-upload | User can safely retry — matching is idempotent on email/contact-number/employee-code, so a retry updates rather than duplicates |
| Same file uploaded twice (after a refresh) | Allowed; creates a new `BulkUpload` history entry; per-row matching stays idempotent |
| 5,000 valid rows | Completes within acceptable performance limits (see [Open Questions](#open-questions--assumptions) for what "acceptable" means here) |
| Simultaneous uploads by multiple admins | Processed independently, no cross-upload data corruption |

## Out of Scope

- Sending invite emails as part of upload or import — always a separate, later action via [008](./008-employee-invitation.md)/[009](./009-employee-listing.md).
- Malware scanning of uploaded files — noted as a security consideration but not implemented as part of this story (see Security below).
- Editing rows inline within the validation summary before confirming import — a row with an error must be fixed in the source file and re-uploaded, not patched in the browser.
- A UI for browsing past bulk-upload history (`BulkUpload` rows) beyond the immediate summary of the upload just performed.

## Security

- JWT authentication required (existing `requireAuth` middleware) for every endpoint in this story.
- Only a Company Administrator may access Bulk Invite — see [Open Questions](#open-questions--assumptions) for how this check is implemented given no formal permission system exists elsewhere in this codebase yet ([006](./006-roles-and-privileges-management.md)'s Roles aren't wired to enforcement; [007](./007-associated-organizations-network.md) introduced the only other role check so far, against `OrganizationMember.role`).
- File MIME type and extension are both validated (not extension alone), to reduce spoofing risk.
- Every cell beginning with `=`, `+`, `-`, or `@` is sanitized before being written into the generated error-report spreadsheet or read back from an uploaded one, to prevent CSV/Excel formula injection.
- Every upload (and its resulting creates/updates) is captured in the audit log.

## Open Questions / Assumptions

- **"Company Administrator" enforcement mechanism isn't yet decided**: this story (and [009](./009-employee-listing.md)'s suspend rules) assume there's a way to check "is the caller a Company Administrator," but no such check exists yet in this codebase beyond [007](./007-associated-organizations-network.md)'s `OrganizationMember.role === "owner"` gate. Whether "Company Administrator" here means that same `role: "owner"` value, or [006](./006-roles-and-privileges-management.md)'s "Company Admin" default `Role` (a different, not-yet-enforced entity), needs to be settled once — consistently — across all of Employee Management (008/009/010), not decided independently per story. Resolved for documentation purposes as: the pre-existing `OrganizationMember.role === "owner"` column, matching [007](./007-associated-organizations-network.md)'s precedent, since it's the only enforcement mechanism that actually exists today.
- **5,000-row / 10 MB limits and "acceptable performance"** are carried over as-specified from the source request; no concrete latency/timeout target is defined here (e.g. "must complete within N seconds") — flagged as something to pin down with a real number before load-testing against it.
- **Malware scanning** is mentioned as a security nice-to-have in the source spec ("if integrated") but isn't a concrete requirement of this story — no scanning provider/integration is chosen here.
- **Matching priority order (Email → Contact Number → Employee ID)** is carried over as-specified; if two of these fields disagree about which existing employee a row matches (e.g. the email matches employee A but the employee ID matches employee B), the first match in priority order (Email) wins — this specific tie-break wasn't explicit in the source spec and is filled in here for determinism.
