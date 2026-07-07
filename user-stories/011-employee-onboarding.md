# 011 - Employee Onboarding

**Status:** Draft
**Epic:** Employee Management

## Overview

Covers the invited employee's own side of [008-employee-invitation.md](./008-employee-invitation.md): what happens after **Send Invite** (or **Resend Invitation**, see [009-employee-listing.md](./009-employee-listing.md)) actually sends an email, and the 4-step flow that runs when the recipient clicks the link inside it. This is the "future story" both [008](./008-employee-invitation.md)'s Overview and Out of Scope, and [009](./009-employee-listing.md)'s Resend Invitation, explicitly deferred — it exists now as **Story 4** of the Employee Management epic (extending the epic's original "3 stories" framing from [008](./008-employee-invitation.md)'s Overview), added at explicit request.

Structurally this mirrors [002-organization-signup.md](./002-organization-signup.md)'s registration wizard closely — a multi-step, token-gated, public (unauthenticated) flow that ends in a real login session — but triggered by an admin-sent invite link instead of self-service signup, and starting from an `Employee` row that already exists (created in [008](./008-employee-invitation.md)'s Step 1) rather than creating one from scratch. Reuses that flow's exact validation, OTP, and JWT conventions wherever they apply.

---

## Story: Send the invite email with a real onboarding link

**As an** invited employee
**I want** the invitation email to contain a working link
**So that** I can actually get into the system

### Flow

1. Whenever `POST /api/employees/:id/send-invite` runs — the first time (008's Step 4) or any later resend (009's Resend Invitation, same endpoint) — the backend mints a fresh, single-purpose **onboarding token** for that employee and builds the link `{CORS_ORIGIN}/onboarding?token={token}` (`CORS_ORIGIN` is the existing frontend-origin config value, already `http://localhost:3000` in dev — see [Open Questions](#open-questions--assumptions) for why no separate URL config was added).
2. The email is sent for real, through the same SMTP transporter `src/utils/mailer.ts` already uses for OTP emails — no longer a `console.log` dev stub, since the reason it was one (no real URL to send) no longer applies (see [008](./008-employee-invitation.md)'s Open Questions).
3. Every send — first or resend — mints a **brand-new** token; there's no way to reuse an old email's link past its own validity window (see below). This is a deliberate simplification: a resend supersedes, it doesn't extend, the previous link.
4. The rate-limit (5 sends/day) and already-registered (409) rules from [008](./008-employee-invitation.md)/[009](./009-employee-listing.md) are unchanged — this story only changes what's inside the email and how it's delivered, not when sending is allowed.

### Acceptance Criteria

- **Given** an admin clicks Send Invite or Resend Invite, **when** the request succeeds, **then** a real email is sent to the employee's address containing a link of the form `{CORS_ORIGIN}/onboarding?token={token}`.
- **Given** the same employee is invited, then resent, **when** both links are compared, **then** they contain different tokens, and only the most recently issued one is valid.

---

## Story: Onboarding Step 1 — Verify the link, set a password

**As an** invited employee
**I want to** land on a working page when I click the invite link, and set my own password
**So that** I can start using my own account

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Onboarding – Step 1 | Email (pre-filled from the invite, **disabled** — not editable) | text | — |
| Onboarding – Step 1 | Password | password | Yes |
| Onboarding – Step 1 | Confirm Password | password | Yes |
| Onboarding – Step 1 | Continue button | button | — |

### Flow

1. Loading `/onboarding?token={token}` immediately calls a token-check API with the token from the URL (before rendering any form) — this is the **first thing** that happens, ahead of anything else in this flow.
   - **Valid token** (signature ok, not expired, points at an `Employee` that still has `invitationStatus: "pending"`) → renders Step 1 with Email pre-filled and disabled.
   - **Invalid, expired, or already-registered** → an error screen ("This invitation link is no longer valid.") with no form — no path back into this flow from here; the employee needs a fresh invite from their admin.
2. Employee enters Password + Confirm Password; client-side validates (same strength rule as registration) before submitting.
3. On Continue, frontend calls the set-password API with the token.
   - **Success** → advances to Step 2.
   - **Token expired/invalid by the time of submit** (the 10-minute window elapsed while they were on this screen) → same "no longer valid" error screen as above, no retry path except a fresh invite.
   - **Unexpected server error** → generic error toast, stays on Step 1.

### Validation Rules

| Field | Rule |
|-------|------|
| Token | Must be a valid, unexpired (10 minutes from send) onboarding token for an employee whose `invitationStatus` is still `"pending"`. |
| Password | Same strength rule as [001](./001-authentication.md)/[002](./002-organization-signup.md): min 8 characters, upper+lower+number+special character. |
| Confirm Password | Must match Password. |

### Acceptance Criteria

- **Given** a valid, unexpired token, **when** the page loads, **then** Step 1 renders with Email shown and disabled.
- **Given** an expired or invalid token, **when** the page loads, **then** an error screen is shown instead of any form.
- **Given** a token that was valid at page-load but expires before Continue is clicked, **when** the employee submits, **then** the same invalid-link error is shown.
- **Given** a strong, matching Password/Confirm Password, **when** the employee clicks Continue, **then** the password is saved and the flow advances to Step 2.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Invalid/expired/already-used token | "This invitation link is no longer valid. Please ask your admin to resend it." |
| Password too weak | "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character." |
| Passwords don't match | "Passwords do not match." |
| Server/network error | "Something went wrong. Please try again." |

---

## Story: Onboarding Step 2 — Confirm name and title

**As an** invited employee
**I want to** review and, if needed, correct the name/title my admin entered for me
**So that** my profile is accurate before I start using the platform

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Onboarding – Step 2 | Title (pre-selected from the value the admin entered in [008](./008-employee-invitation.md), editable) | select (Mr / Mrs / Ms) | Yes |
| Onboarding – Step 2 | First Name (pre-filled, editable) | text | Yes |
| Onboarding – Step 2 | Last Name (pre-filled, editable) | text | Yes |
| Onboarding – Step 2 | Continue button | button | — |

### Flow

1. Fields are pre-filled from the `Employee` row's existing `title`/`firstName`/`lastName` (set by the admin in 008's Step 1) — the employee can change any of them.
2. On Continue, frontend validates client-side (same rules as [008](./008-employee-invitation.md)'s Step 1), then calls the update-profile API with the token.
   - **Success** → advances to Step 3.
   - **Unexpected server error** → generic error toast, stays on Step 2.

### Validation Rules

Same as [008](./008-employee-invitation.md)'s Basic Information step: Title required (one of Mr/Mrs/Ms); First/Last Name required, 2–50 characters, letters and spaces only.

### Acceptance Criteria

- **Given** the admin entered "Rahul"/"Sharma"/"Mr" in 008, **when** the employee reaches Step 2, **then** those exact values are pre-filled and editable.
- **Given** the employee changes any field to a valid value, **when** they click Continue, **then** the `Employee` row is updated and the flow advances to Step 3.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Title required | "Select a valid title." |
| First/Last Name invalid | "Only alphabets allowed." |
| Server/network error | "Something went wrong. Please try again." |

---

## Story: Onboarding Step 3 — Mobile number

**As an** invited employee
**I want to** optionally add my mobile number
**So that** I can receive mobile-based notifications later, without being forced to right now

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Onboarding – Step 3 | Country Code | select | Yes, if Contact Number is entered |
| Onboarding – Step 3 | Contact Number | text (numeric) | No |
| Onboarding – Step 3 | Skip button | button → finishes onboarding immediately, no mobile verification | — |
| Onboarding – Step 3 | Verify button | button → saves the number, sends an OTP, advances to Step 4 | — |

### Flow

1. Employee optionally enters a mobile number.
2. **Skip** → finishes onboarding right away (see the shared "Finishing onboarding" behavior below) and redirects to the dashboard, already logged in. No mobile number is saved if none was entered; if one was typed but Skip is clicked anyway, it is **not** saved either — Skip discards whatever's in the field, matching "skip this step entirely," not "save without verifying." (See [Open Questions](#open-questions--assumptions) for why this differs slightly from how 002/008 treat their own mobile-skip cases.)
3. **Verify** — requires a valid contact number first (client-side validated); saves `countryCode`/`contactNumber` on the `Employee` row, sends a mobile OTP, and advances to Step 4.
   - **Contact number already in use** (globally unique per [008](./008-employee-invitation.md)'s Data Model, now enforced across all employees, not per-organization, per the merge in [008](./008-employee-invitation.md)'s Open Questions) → inline error, stays on Step 3.
   - **Unexpected server error** → generic error toast, stays on Step 3.

### Validation Rules

| Field | Rule |
|-------|------|
| Contact Number | Optional overall; if provided, numeric, 7–15 digits (same as [008](./008-employee-invitation.md)'s), and must be globally unique. |

### Acceptance Criteria

- **Given** no mobile number entered, **when** the employee clicks Skip, **then** onboarding finishes and they land on the dashboard, logged in.
- **Given** a mobile number entered, **when** the employee clicks Skip anyway, **then** onboarding finishes without saving that number.
- **Given** a valid, unused mobile number, **when** the employee clicks Verify, **then** the number is saved, an OTP is sent, and the flow advances to Step 4.
- **Given** a mobile number already used by another employee, **when** the employee clicks Verify, **then** an inline error is shown and nothing is saved.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Contact number invalid | "Enter a valid contact number." |
| Contact number already in use | "This contact number is already in use." |
| Server/network error | "Something went wrong. Please try again." |

---

## Story: Onboarding Step 4 — Mobile OTP verification

**As an** invited employee
**I want to** verify the OTP sent to my mobile, or skip it
**So that** I can finish setting up my account either way

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Onboarding – Step 4 | OTP | text (6-digit) | Yes, only if submitting Verify |
| Onboarding – Step 4 | Skip button | button → finishes onboarding without verifying the mobile number | — |
| Onboarding – Step 4 | Verify button | button → checks the OTP; on success, finishes onboarding | — |
| Onboarding – Step 4 | Resend OTP | link/button, same cooldown pattern as [002](./002-organization-signup.md) | — |

### Flow

1. **Skip** → finishes onboarding (see below) and redirects to the dashboard, logged in; the mobile number saved in Step 3 stays on record but unverified (`mobileVerifiedAt` stays null).
2. Employee enters the 6-digit OTP and clicks **Verify**.
   - **Correct OTP** → marks the mobile number verified, finishes onboarding, redirects to the dashboard, logged in.
   - **Incorrect OTP** → inline error, stays on Step 4, does **not** finish onboarding.
   - **Expired OTP** → inline error naming it, same OTP-expiry pattern as [002](./002-organization-signup.md)/[001](./001-authentication.md).
3. **Resend OTP** reuses the same daily/cooldown rules already established for OTPs elsewhere in this codebase.

### Validation Rules

| Field | Rule |
|-------|------|
| OTP | Exactly 6 digits. |

### Acceptance Criteria

- **Given** Step 4 is reached, **when** the employee clicks Skip, **then** onboarding finishes and they land on the dashboard, logged in, with their mobile number unverified.
- **Given** the correct OTP, **when** the employee clicks Verify, **then** the mobile number is marked verified, onboarding finishes, and they land on the dashboard, logged in.
- **Given** an incorrect OTP, **when** the employee clicks Verify, **then** an inline error is shown and they remain on Step 4.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Invalid/incorrect OTP | "Invalid OTP. Please try again." |
| Expired OTP | "This OTP has expired. Please request a new one." |
| Server/network error | "Something went wrong. Please try again." |

---

## Shared behavior: "Finishing onboarding"

Three of the four exit points above (Step 3 Skip, Step 4 Skip, Step 4 Verify-success) all do the same thing, via the same backend endpoint:

1. Marks the `Employee` row `invitationStatus: "registered"` — this is the **only** place that transition happens for an admin-created employee (as opposed to a self-registered organization creator, whose `Employee` row is created already-registered — see [008](./008-employee-invitation.md)'s Open Questions on the User → Employee merge).
2. Issues a real access-token session cookie (and a refresh token in the response body), exactly like [002](./002-organization-signup.md)'s `completeRegistration` does.
3. The frontend redirects to the dashboard; the employee is now a fully logged-in user of the platform.

Once `invitationStatus` is `"registered"`, [009-employee-listing.md](./009-employee-listing.md)'s Employee Listing reflects this automatically — no changes needed there: the Invitation Status column already reads "Registered," the Resend Invite row action already disappears (it's gated on `invitationStatus === "pending"`), and the Suspend/Activate toggle is already shown unconditionally for every employee regardless of invitation state.

---

## API Design

None of these are behind `requireAuth` — the employee has no session yet. They're mounted at their own top-level path (`/api/employee-onboarding`), not nested under the already-authenticated `/api/employees`, so they can't accidentally inherit that router's auth gate.

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| POST | `/api/employee-onboarding/verify-token` | `{ token }` | `{ email, title, firstName, lastName }` |
| POST | `/api/employee-onboarding/password` | `{ token, password }` | `{ message }` |
| POST | `/api/employee-onboarding/profile` | `{ token, title, firstName, lastName }` | `{ message }` |
| PUT | `/api/employee-onboarding/mobile` | `{ token, countryCode, contactNumber }` | `{ message }` |
| POST | `/api/employee-onboarding/mobile-otp` | `{ token }` (resend) | `{ message }` |
| POST | `/api/employee-onboarding/mobile-otp/verify` | `{ token, otp }` | `{ message }` |
| POST | `/api/employee-onboarding/complete` | `{ token }` | `{ user: { id, name, email, phone }, organization, accessToken, refreshToken }` (sets the auth cookie too, same shape as `completeRegistration`) |

Every endpoint re-verifies the token itself (same shape as [002](./002-organization-signup.md)'s `requireRegistrationUser` guard) — the token isn't exchanged for a longer-lived one partway through, unlike registration's `registrationToken`. This means the entire 4-step flow must be completed within the token's one 10-minute window from when the invite was sent, not 10 minutes per step — see [Open Questions](#open-questions--assumptions) for why, and the risk that implies.

Error responses follow the existing convention (`{ error: string }`): 400 (validation), 401 (invalid/expired/already-used token), 409 (mobile number already in use), 429 (OTP resend cooldown), 500 (unexpected).

## Data Model

No new tables. Reuses fields already on `Employee` from [008](./008-employee-invitation.md)'s Data Model (and the User → Employee merge that added the auth-related ones): `passwordHash`, `emailVerifiedAt`, `mobileVerifiedAt`, `title`/`firstName`/`lastName`, `countryCode`/`contactNumber`, `invitationStatus`. The onboarding token itself is a stateless JWT (like `registrationToken`), not a database row — no new `Otp` purpose needed either; mobile OTP reuses the existing `"mobile_verification"` purpose, identical to [002](./002-organization-signup.md)'s.

## Validation Rules Summary

| Field type | Rule |
|------------|------|
| Onboarding token | Valid signature, unexpired (10 minutes from issuance), points at an employee whose `invitationStatus` is still `"pending"` |
| Password | Min 8 characters, upper+lower+number+special character (same as [001](./001-authentication.md)) |
| Title/First/Last Name | Same as [008](./008-employee-invitation.md)'s Basic Information rules |
| Contact Number | Numeric, 7–15 digits, globally unique |
| OTP | Exactly 6 digits |

## Test Cases

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|------------------|
| TC-01 | Valid link | Click a freshly-sent invite link | Step 1 renders, email shown disabled |
| TC-02 | Expired link | Click a link more than 10 minutes after it was sent | Invalid-link error screen |
| TC-03 | Already-registered link | Click an old link for an employee who already finished onboarding | Invalid-link error screen |
| TC-04 | Set password | Enter a strong, matching password, Continue | Advances to Step 2 |
| TC-05 | Weak password | Enter a weak password | Blocked client-side |
| TC-06 | Edit name/title | Change First Name on Step 2, Continue | Employee row updated, advances to Step 3 |
| TC-07 | Mobile Skip, no number entered | Step 3, Skip | Onboarding finishes, redirected to dashboard logged in |
| TC-08 | Mobile Skip, number entered but skipped | Step 3, type a number, then Skip | Onboarding finishes, number NOT saved |
| TC-09 | Mobile Verify | Step 3, valid number, Verify | Number saved, OTP sent, advances to Step 4 |
| TC-10 | Mobile OTP Skip | Step 4, Skip | Onboarding finishes, mobile stays unverified |
| TC-11 | Mobile OTP correct | Step 4, correct OTP, Verify | Mobile verified, onboarding finishes, dashboard |
| TC-12 | Mobile OTP incorrect | Step 4, wrong OTP, Verify | Inline error, stays on Step 4 |
| TC-13 | Resend then click old invite link | Admin resends, employee clicks the original (now-superseded) link | Invalid-link error, since only the newest token is valid |
| TC-14 | Listing reflects completion | Complete onboarding, then check Employee Listing | Row shows "Registered," Resend Invite gone, Suspend/Activate still present |

## Edge Cases

- **Employee clicks the link twice, completing onboarding the first time**: the second click's token-check finds `invitationStatus: "registered"` and shows the invalid-link error — correct, matches TC-03.
- **Two browser tabs mid-flow, one finishes first**: the second tab's next step-submit re-verifies the token server-side and fails once the first tab's completion flips `invitationStatus` — same guard as every other step.
- **Admin suspends the employee while they're mid-onboarding**: not specifically guarded against in this story — the token-check only looks at `invitationStatus`, not `status`. A suspended-but-still-pending employee could still complete onboarding and log in immediately into a suspended account, which would then behave however "suspended" already behaves elsewhere (out of scope to define further here — flagged, not solved).

## Out of Scope

- Letting the employee change their email address during onboarding — it's fixed to whatever the admin entered, by design (disabled field in Step 1).
- Any password-reset/forgot-password entry point specific to a not-yet-onboarded employee — they must complete onboarding via the invite link first; [001](./001-authentication.md)'s forgot-password flow already covers a normal login-email/mobile reset once they have a real account.
- Re-sending the onboarding email from anywhere other than [009](./009-employee-listing.md)'s existing Resend Invitation action — no separate "resend onboarding link" surface is added here.

## Open Questions / Assumptions

- **The onboarding token has one flat 10-minute window covering all 4 steps, not 10 minutes per step** — a literal reading of the request ("token check api call and token is valid for 10 mins"). This is materially tighter than [002](./002-organization-signup.md)'s registration flow, where each step exchanges for its own token/extends the window. A real employee filling out 4 screens (including waiting for and typing an OTP) inside 10 minutes flat from opening their email is a tight, possibly frustrating constraint — implemented exactly as asked, but flagged clearly since it's the single riskiest UX assumption in this story. If it proves too tight in practice, the fix is straightforward (re-issue a fresh, longer-lived session token after Step 1's password is set, mirroring registration's `registrationToken` pattern) but wasn't done preemptively since it wasn't asked for.
- **No separate `FRONTEND_URL`/`ONBOARDING_BASE_URL` config was added** — the onboarding link is built from the existing `CORS_ORIGIN` env var, since in this app's current single-frontend setup they're always the same value; introducing a second config var for the same value seemed like needless duplication. Revisit if the frontend and CORS origins ever need to diverge (e.g. a CDN in front of the frontend).
- **Skip-with-a-number-typed-but-not-saved (Step 3)** is a deliberate reading of "Skip" as "skip this step, full stop" rather than "save quietly, verify later" — slightly different from how a couple of other flows in this codebase treat similar skips (e.g. some save-then-skip in other steps). Chosen for simplicity and because the request's wording for this step didn't distinguish the two; revisit if a "save even when skipping verification" behavior is actually wanted.
- **A suspended-but-not-yet-onboarded employee can still complete onboarding and log in** (see Edge Cases) — not addressed here, since neither the request nor [009](./009-employee-listing.md) defines what "suspended" should block beyond the Employee Listing's own UI. Flagged as a gap for whoever eventually defines session-level suspension enforcement app-wide (there isn't any yet, for any user).
