# 012 - Employee Profile

**Status:** Done
**Epic:** Employee Profile

## Overview

Covers the logged-in employee's own self-service account screen — the "View Profile" link already sitting in the header's Profile dropdown ([003-header-navigation.md](./003-header-navigation.md)), currently a placeholder (`frontend/src/app/(private)/profile/page.tsx` renders `<ComingSoon title="View Profile" />`). This is deliberately **not** part of the Employee Management epic ([008](./008-employee-invitation.md)–[011](./011-employee-onboarding.md)): those stories are an admin managing *other* employees, and [009-employee-listing.md](./009-employee-listing.md) explicitly excludes the caller's own row from that table on the stated grounds that "an admin manages their own account elsewhere, not through this table." This story is that "elsewhere," and it applies to every logged-in employee, not just admins — every `Employee` row is a login identity ([backend/CLAUDE.md](../backend/CLAUDE.md)'s User → Employee merge), so every employee has a profile to view and manage regardless of role.

Three tightly-coupled flows on one screen: viewing your own details, editing the personal fields you're allowed to change yourself, and changing your password. Reuses this codebase's existing field-validation rules ([008](./008-employee-invitation.md)'s personal-info fields), OTP mechanism ([Otp](../backend/src/models/otp.model.ts)'s `mobile_verification` purpose, already used by registration/onboarding), and password rules ([001-authentication.md](./001-authentication.md)'s Reset Password step) wherever they apply, rather than inventing new ones.

---

## Story: View Profile

**As a** logged-in employee
**I want to** see my own account details
**So that** I can confirm what the organization has on file for me

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| View Profile | Title, First Name, Last Name | read-only text | — |
| View Profile | Email | read-only text | — |
| View Profile | Country Code + Contact Number | read-only text | — |
| View Profile | Date of Birth | read-only text | — |
| View Profile | Gender | read-only text | — |
| View Profile | Employee ID | read-only text | — |
| View Profile | Organization Name | read-only text | — |
| View Profile | Role, Department, Grade | read-only text | — |
| View Profile | Employee Status (Active/Suspended) | read-only badge | — |
| View Profile | "Edit Profile" button | button → Edit Profile (see below) | — |
| View Profile | "Change Password" button | button → Change Password (see below) | — |

### Flow

1. Navigating to `/profile` (via the header's Profile dropdown → "View Profile," per [003](./003-header-navigation.md)) fetches the caller's own full profile and renders it read-only.
2. A field left blank on the underlying `Employee` row (e.g. `dob`/`gender`/`countryCode`/`contactNumber` for someone who self-registered rather than was invited, or `employeeCode` since it's always optional) renders as "—", not an empty cell.
3. "Edit Profile" and "Change Password" are two separate actions from this same screen, not a single combined form — editing personal info and changing a password are different enough operations (different validation, different risk) to keep as distinct, explicit steps, matching how [001](./001-authentication.md) already keeps Login and Forgot Password as separate flows rather than one screen.

### Acceptance Criteria

- **Given** a logged-in employee navigates to `/profile`, **when** the page loads, **then** it shows their own details only — never another employee's, regardless of role.
- **Given** a field on the caller's own record is null (e.g. a self-registered org creator has no `dob`), **when** View Profile renders, **then** that field shows "—" rather than blank or "null".

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Server/network error loading the profile | "Something went wrong. Please try again." |

---

## Story: Edit Profile

**As a** logged-in employee
**I want to** update my own personal details — everything except my email address and my organization
**So that** my details stay current without needing an admin to do it for me

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Edit Profile | Title | dropdown (`Mr`/`Mrs`/`Ms`) | Yes |
| Edit Profile | First Name, Last Name | text | Yes |
| Edit Profile | Email | read-only text (not editable here) | — |
| Edit Profile | Country Code + Contact Number | text, with an inline "Verify" step when changed | Yes |
| Edit Profile | Date of Birth | date | No |
| Edit Profile | Gender | dropdown (`Male`/`Female`/`Other`) | Yes |
| Edit Profile | Employee ID | text | No |
| Edit Profile | "Save" button | button | — |
| Edit Profile | "Cancel" button | button → back to View Profile, discarding unsaved changes | — |

### Flow

1. **Everything on this screen is self-editable except Email** — Title, First Name, Last Name, Date of Birth, Gender, Employee ID save immediately on **Save**, same validation as [008](./008-employee-invitation.md)'s equivalent fields (Employee ID's own org-scoped uniqueness check included). Email is the login identifier — changing it needs its own re-verification flow to prove ownership of the new address, which this story doesn't build (see [Out of Scope](#out-of-scope)).
2. **Which organization the employee belongs to, and their Role/Department/Grade within it, are not editable from this screen at all** — Organization is fixed at account creation ([backend/CLAUDE.md](../backend/CLAUDE.md)'s User → Employee merge: `Employee.organizationId` never changes after creation), and Role/Department/Grade are governed, admin-only assignments ([009](./009-employee-listing.md)'s Edit action) precisely because they carry real privileges (approval authority, access scope) that shouldn't be self-service. Edit Profile never reads or writes `EmployeeCompanyAccess` or `organizationId`.
3. **Changing the Contact Number requires OTP re-verification before it takes effect** — entering a new number and clicking Save doesn't update the record immediately; it sends a 6-digit OTP to the *new* number (reusing `Otp`'s `mobile_verification` purpose, the same mechanism [002](./002-organization-signup.md)'s registration and [011](./011-employee-onboarding.md)'s onboarding already use) and shows an inline OTP field. The Employee's stored `contactNumber` only changes once that OTP is verified. Leaving the Contact Number field unchanged doesn't trigger this at all — only an actual edit to that field does; every other field on this screen (including Employee ID) saves directly with no comparable re-verification step.
4. If the admin edits this same employee's Role/Department/Grade/Company Access via [009](./009-employee-listing.md) while this employee is mid-edit here, the next Save on this screen doesn't touch those fields at all, per point 2 above — there's no conflict to resolve.
5. **Cancel** discards any unsaved field changes and returns to View Profile; if a mobile-number-change OTP is pending and unverified when Cancel is clicked, it's abandoned (the old contact number remains on file).

### Validation Rules

| Field | Rule |
|-------|------|
| Title | One of `Mr`, `Mrs`, `Ms`. |
| First Name, Last Name | 2–50 characters, letters and spaces only (matches [008](./008-employee-invitation.md)'s `EMPLOYEE_NAME_REGEX`). |
| Contact Number | Numeric, 7–15 digits ([008](./008-employee-invitation.md)'s existing rule). Must not already belong to a different employee (checked globally, not per-organization — `Employee.(countryCode, contactNumber)` is a global unique constraint since the User → Employee merge). |
| Contact Number OTP | 6 digits, matches the most recently sent unconsumed OTP for that number, not expired (10-minute window, same as every other OTP purpose in this codebase). |
| Date of Birth | Optional. Cannot be in the future; implies age ≥ 18 when provided. |
| Gender | One of `Male`, `Female`, `Other`. |
| Employee ID | Optional. At most 30 characters. If provided, must be unique within the organization (same rule and scope as [008](./008-employee-invitation.md)'s own Employee ID field — excluding the caller's own current value, same as [009](./009-employee-listing.md)'s Edit action excludes the row being edited). |

### Acceptance Criteria

- **Given** a valid Title/First Name/Last Name/DOB/Gender/Employee ID change, **when** Save is clicked, **then** the change applies immediately and View Profile reflects it.
- **Given** the Contact Number field is changed to a new value and Save is clicked, **when** the request succeeds, **then** an OTP is sent to the *new* number and the stored `contactNumber` is **not** yet updated.
- **Given** a correct, unexpired OTP is entered for a pending contact-number change, **when** verified, **then** the Employee's `contactNumber` updates to the new value.
- **Given** an incorrect OTP is entered, **when** submitted, **then** an inline error shows and the stored contact number is unchanged.
- **Given** a new Contact Number that's already in use by a different employee (in any organization), **when** Save is clicked, **then** the request is rejected before any OTP is sent.
- **Given** a new Employee ID that's already in use by a different employee in the same organization, **when** Save is clicked, **then** the request is rejected and no other field on the same Save is applied either.
- **Given** an attempt to submit an Email, Organization, Role, Department, or Grade change through this screen's API, **when** the request is made, **then** it's rejected or ignored server-side — the endpoint doesn't accept those fields at all, not merely hides them client-side.
- **Given** unsaved changes and Cancel is clicked, **when** the user returns to View Profile, **then** none of those changes were persisted.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Invalid Title/Gender | "Select a valid title." / "Select a valid gender." |
| Invalid First/Last Name | "First Name is required." / "Last Name is required." |
| Invalid Contact Number format | "Enter a valid contact number." |
| Contact Number already in use | "This contact number is already in use." |
| Employee ID too long | "Employee ID must be at most 30 characters." |
| Employee ID already in use | "This Employee ID is already in use." |
| DOB in the future | "Date of birth cannot be in the future." |
| Underage DOB | "Employee must be at least 18 years old." |
| Invalid/expired OTP | "Invalid OTP. Please try again." / "This OTP has expired. Please request a new one." |
| Save succeeded | "Profile updated." |
| Mobile number changed successfully | "Mobile number updated." |
| Server/network error | "Something went wrong. Please try again." |

---

## Story: Change Password

**As a** logged-in employee
**I want to** change my password from within the app
**So that** I don't have to log out and use Forgot Password just to update it

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Change Password | Current Password | password | Yes |
| Change Password | New Password | password | Yes |
| Change Password | Confirm New Password | password | Yes |
| Change Password | "Save" button | button | — |
| Change Password | "Cancel" button | button → back to View Profile | — |

### Flow

1. Current Password is verified against the stored hash before the new password is accepted — this is what distinguishes this flow from [001](./001-authentication.md)'s Forgot Password (which resets a password the user can't remember, via OTP, with no "current password" to check).
2. On success, the new password takes effect immediately for future logins. The current session's own cookie is left as-is (no forced re-login) — see [Open Questions](#open-questions--assumptions) for why this doesn't extend to invalidating *other* sessions/devices.
3. **Cancel** discards whatever was typed and returns to View Profile; nothing is submitted.

### Validation Rules

| Field | Rule |
|-------|------|
| Current Password | Must match the employee's stored password hash. |
| New Password | At least 8 characters, containing an uppercase letter, a lowercase letter, a number, and a special character (same `PASSWORD_REGEX` as every other password field in this codebase). |
| Confirm New Password | Must exactly match New Password. |
| New Password vs. Current | New Password must differ from Current Password. |

### Acceptance Criteria

- **Given** the correct Current Password and a valid, matching New/Confirm Password, **when** Save is clicked, **then** the password updates and a success toast shows.
- **Given** an incorrect Current Password, **when** Save is clicked, **then** the request is rejected and no password change occurs.
- **Given** a New Password that doesn't meet the strength rule, **when** Save is clicked, **then** the form is blocked client-side with an inline error.
- **Given** New Password and Confirm New Password don't match, **when** Save is clicked, **then** the form is blocked client-side with an inline error.
- **Given** a New Password identical to the Current Password, **when** Save is clicked, **then** the request is rejected with an inline error.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Incorrect current password | "Current password is incorrect." |
| Weak new password | "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character." |
| Passwords don't match | "Passwords do not match." |
| New password same as current | "New password must be different from your current password." |
| Success | "Password changed." |
| Server/network error | "Something went wrong. Please try again." |

---

## API Design

All endpoints are authenticated (session cookie via `requireAuth`) and act only on the caller's own `Employee` row (`req.userId`) — none take an `:id` param, unlike [009](./009-employee-listing.md)'s admin-facing equivalents, precisely so there's no way to point one of these at a colleague's record.

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| GET | `/api/employees/me` | — | `{ employee: { id, title, firstName, lastName, email, countryCode, contactNumber, dob, gender, employeeCode, status, invitationStatus, organizationName, role, department, grade } }` |
| PATCH | `/api/employees/me` | `{ title, firstName, lastName, dob?, gender, employeeCode? }` | `{ message }` |
| PUT | `/api/employees/me/mobile` | `{ countryCode, contactNumber }` | `{ message }` (sends OTP; does not change the stored number yet) |
| POST | `/api/employees/me/mobile-otp` | — | `{ message }` (resend, same cooldown as every other OTP purpose) |
| POST | `/api/employees/me/mobile-otp/verify` | `{ otp }` | `{ message }` (applies the pending number on success) |
| PATCH | `/api/auth/me/password` | `{ currentPassword, newPassword }` | `{ message }` |

`PATCH /api/employees/me`'s accepted body is deliberately narrow — `email`, `organizationId`, `roleId`, `departmentId`, and `gradeId` are not fields this endpoint reads at all, so there's no server-side reliance on the frontend simply not rendering those controls; sending them in the request body has no effect. Error responses follow the existing convention (`{ error: string }`): 400 (validation failures, incorrect current password), 401 (no session), 409 (contact number or Employee ID already in use), 500 (unexpected). `PATCH /api/auth/me/password` lives under `/auth`, not `/employees`, matching where [001](./001-authentication.md)'s other password endpoints (`request-otp`/`verify-otp`/`reset-password`) already live — this is about credentials, not employee-record fields.

## Data Model

No new tables. Writes land on the same `Employee` columns [008](./008-employee-invitation.md)'s invite wizard and [011](./011-employee-onboarding.md)'s onboarding already use (`title`/`firstName`/`lastName`/`dob`/`gender`/`countryCode`/`contactNumber`/`passwordHash`), and the pending-mobile-number-change OTP reuses `Otp` under `purpose: "mobile_verification"`, `identifier` set to the *new* contact number being verified — same shape as every other mobile-OTP flow in this codebase, no schema change needed.

## Validation Rules Summary

| Field type | Rule |
|------------|------|
| Title | `Mr` / `Mrs` / `Ms` |
| First Name, Last Name | 2–50 characters, letters and spaces only |
| Contact Number | Numeric, 7–15 digits; globally unique across employees |
| OTP | 6 digits, 10-minute expiry |
| DOB | Optional; not future; implies age ≥ 18 when provided |
| Gender | `Male` / `Female` / `Other` |
| Employee ID | Optional; ≤ 30 characters; unique within the organization |
| Password | ≥ 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character |

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| EP-01 | View own profile | Shows the caller's own details, all fields correctly labeled/formatted |
| EP-02 | Null optional field renders | Shows "—", not blank |
| EP-03 | Edit name/title/DOB/gender/Employee ID, valid values | Saves immediately, View Profile reflects the change |
| EP-04 | Edit DOB to a future date | Rejected client-side |
| EP-05 | Edit DOB implying age < 18 | Rejected client-side |
| EP-06 | Change contact number to a new, unused value | OTP sent to the new number; stored number unchanged until verified |
| EP-07 | Verify the mobile-change OTP correctly | Stored contact number updates |
| EP-08 | Enter an incorrect mobile-change OTP | Rejected, stored number unchanged |
| EP-09 | Change contact number to one already in use | Rejected before any OTP is sent |
| EP-10 | Cancel Edit Profile with unsaved changes | Nothing persisted |
| EP-11 | Cancel a pending, unverified mobile number change | Old number remains on file |
| EP-12 | Change password with correct current password and valid new password | Succeeds |
| EP-13 | Change password with incorrect current password | Rejected |
| EP-14 | New password fails strength rule | Rejected client-side |
| EP-15 | New/Confirm password mismatch | Rejected client-side |
| EP-16 | New password identical to current password | Rejected |
| EP-17 | Attempt to reach another employee's profile data | Impossible via this API — every endpoint here is scoped to `req.userId`, there's no `:id` variant |
| EP-18 | Change Employee ID to a value already used by a different employee in the same organization | Rejected |
| EP-19 | Change Employee ID to the caller's own current value (no-op change) | Succeeds — excluded from the uniqueness check same as [009](./009-employee-listing.md)'s Edit action excludes the row being edited |
| EP-20 | Send `email`/`organizationId`/`roleId`/`departmentId`/`gradeId` directly in a `PATCH /api/employees/me` request body (bypassing the UI) | No effect — the endpoint doesn't read those fields |

## Edge Cases

| Scenario | Expected Result |
|----------|------------------|
| Self-registered employee with no `dob`/`gender`/`contactNumber` on file yet | View Profile shows "—" for each; Edit Profile treats them as any other edit (Gender still required going forward once edited, Contact Number can be set for the first time here going through the same OTP step as a change) |
| Employee record has no `EmployeeCompanyAccess` row (pre-`008` migrated-in employee, see [backend/CLAUDE.md](../backend/CLAUDE.md)'s User → Employee merge) | Role/Department/Grade show "—" on View Profile rather than erroring |
| Two devices/tabs both mid-way through a mobile-number-change OTP for the same employee | The most recently sent OTP is the only one that verifies (same "supersede, don't extend" pattern as [011](./011-employee-onboarding.md)'s onboarding link resends) |
| Employee's `status` is `suspended` | See [Open Questions](#open-questions--assumptions) — whether a suspended employee can reach this screen at all depends on a login-time check this codebase doesn't have yet |

## Out of Scope

- **Changing your own email address.** The login identifier changing without a proof-of-ownership flow for the *new* address is a meaningfully different (and riskier) feature than anything else in this story — deferred entirely, not partially built.
- **Changing your own Organization, Role, Department, or Grade.** These stay admin-only, via [009](./009-employee-listing.md)'s Edit action — unlike Employee ID (which is just a label the employee themselves can now correct), these carry real privileges and org-scoping that shouldn't be self-service.
- **Uploading a profile photo/avatar.** No such field exists on `Employee`, and no screen in this codebase handles file/image uploads for display (only [010](./010-bulk-invite-employees.md)'s CSV/XLSX upload, a different kind of file entirely).
- **Two-factor authentication, session management (viewing/revoking other active sessions/devices), or account deletion.** None of this infrastructure exists elsewhere in the codebase to extend.
- **Notification preferences or any other account settings** beyond the fields listed above.

## Open Questions / Assumptions

- **Changing your password doesn't invalidate other sessions/devices, because this codebase can't yet.** There's no session-store/refresh-token-revocation mechanism anywhere (see [backend/CLAUDE.md](../backend/CLAUDE.md)'s note that `refreshToken` is issued but not yet redeemable) — the JWT access token already issued to any other logged-in device keeps working until it naturally expires. Flagged here rather than silently assumed; building real revocation is out of this story's scope.
- **Whether a `suspended` employee can log in at all is a pre-existing gap this story surfaces but doesn't resolve**: `login` (`auth.controller.ts`) doesn't currently check `Employee.status`, so a suspended employee can still authenticate and would land on this same profile screen. Whether that's intended (suspension only blocks organization-side actions, not login) or a bug ([009](./009-employee-listing.md)'s whole premise is that Suspend meaningfully restricts someone) should be settled once, consistently, rather than assumed here.
- **Contact Number changes go through OTP re-verification; email changes are out of scope entirely** — an asymmetric treatment of the two identifiers. This mirrors [011](./011-employee-onboarding.md)'s own asymmetry (the onboarding link itself proves email ownership, but mobile gets an explicit OTP step) rather than introducing a new inconsistency.
- **`PATCH /api/auth/me/password` vs. a `/employees/me/password` path** — placed under `/auth` since [001](./001-authentication.md)'s other credential endpoints already live there and this is conceptually "change my credential," not "edit my employee record." Revisit if a future story establishes a different convention for where credential-related actions should live.
- **Employee ID is self-editable; Organization/Role/Department/Grade are not — resolved explicitly, at request, not left to a default reading.** An early draft of this story treated Employee ID the same as Role/Department/Grade (admin-only, since [008](./008-employee-invitation.md) has an admin assign it at invite time) — that's been corrected: Employee ID is just a label with no privilege attached, so there's no reason to withhold it from the person it identifies, whereas Organization/Role/Department/Grade genuinely gate what an employee can do and approve, so those stay admin-only.
