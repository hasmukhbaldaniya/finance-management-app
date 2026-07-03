# 002 - Organization Signup

**Status:** Draft
**Epic:** Organization Signup

## Overview

Covers how a brand-new customer registers their company and creates their own admin account: a 5-step wizard (organization + GST → personal details + credentials → email OTP → mobile number → mobile OTP) that ends in a single "complete" call which returns the user, the organization, and session tokens. The flow is intentionally **asymmetric** — verifying the email address is mandatory and blocks progress, while verifying the mobile number is optional (the user can skip straight to the dashboard, mobile number saved but unverified). This story assumes [001-authentication.md](./001-authentication.md)'s Login story as the sign-in path once an account exists, and reuses its validation policies wherever a field already has one (email, password, OTP, mobile) so frontend and backend never drift apart.

**Organization membership is a foundational invariant, not a per-story detail:** every user account belongs to at least one organization — there is no such thing as a user without an organization, and this story is the only way to create one from scratch (there is no "create an account, add an organization later" path). A user may also belong to **more than one** organization over time. This story only ever creates a single organization for a single brand-new user, but because the invariant is "one-to-many, not one-to-one," the underlying `User`↔`Organization` relationship must be modeled as a membership/join table from the start, not a single `organizationId` column on `User` — see [Open Questions](#open-questions--assumptions) for the schema and backend implications, which apply the next time an organization-related story (e.g. adding/switching organizations) is implemented.

---

## Story: Register Your Company

**As a** prospective customer
**I want** to register my company and create my own account
**So that** I can start using Finance Management for my organization

### Step 1 — Organization Details

**Screens & Fields**

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Register – Step 1 | Organization Name | text | Yes |
| Register – Step 1 | GST Number | text (uppercase alphanumeric) | Yes |
| Register – Step 1 | Continue button | button | — |
| Register – Step 1 | "Already have an account? Log in" link | link → Login | — |

**Flow**

1. User enters Organization Name and GST Number.
2. On blur (debounced), if the GST Number matches the format rule, frontend calls a live availability check API. While the check is in flight, the field shows a pending state; the Continue button stays disabled until the last check for the current value has resolved as available.
3. Frontend runs full client-side validation on submit (format + a required Organization Name). If invalid, block submit and show inline field errors — no API call for format errors.
4. If the last known availability check for the current GST value was "taken", block submit with an inline error and do not call any create API.
5. On success, both values are held in frontend state (not yet persisted) and the user advances to Step 2.
6. At any point, the user can click **"Already have an account? Log in"** to leave the flow and go to the Login screen (nothing has been persisted yet, so there's nothing to clean up).

**Validation Rules**

| Field | Rule |
|-------|------|
| Organization Name | Required, 2–150 characters. |
| GST Number | Required. Must match `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` (standard 15-character GSTIN format). Normalized to uppercase before validating, checking, or storing. Must be unique — checked live via the availability API and re-checked server-side at final submission (Step 2). |

**Acceptance Criteria**

- **Given** a syntactically valid, unused GST Number and a non-empty Organization Name, **when** the user clicks Continue, **then** they advance to Step 2.
- **Given** a GST Number that doesn't match the GSTIN format, **when** the user attempts to submit, **then** the form is blocked client-side with an inline error and no API call is made.
- **Given** a GST Number that is already registered, **when** the availability check resolves, **then** an inline "already registered" error is shown and Continue stays disabled.
- **Given** an empty Organization Name, **when** the user attempts to submit, **then** the form is blocked client-side with an inline "required" error.

**Error / Toast Messages**

| Scenario | Message |
|----------|---------|
| GST Number already registered | "This GST number is already registered." (inline, not a toast) |
| Server/network error during availability check | "Something went wrong. Please try again." |

---

### Step 2 — Personal Details & Credentials

**Screens & Fields**

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Register – Step 2 | First Name | text | Yes |
| Register – Step 2 | Last Name | text | Yes |
| Register – Step 2 | Email | text (email) | Yes |
| Register – Step 2 | Password | password (masked, show/hide toggle) | Yes |
| Register – Step 2 | Confirm Password | password (masked, show/hide toggle) | Yes |
| Register – Step 2 | Continue button | button | — |
| Register – Step 2 | "← Back" link | link → Step 1 | — |

**Flow**

1. User enters all fields and clicks Continue.
2. Frontend runs client-side validation (format, length, strength, match). If invalid, block submit and show inline field errors — no API call.
3. Frontend calls the registration create API with Step 1's Organization Name/GST Number plus this step's fields.
4. Backend re-validates GST Number and Email uniqueness server-side (defends against a race between Step 1's live check and this submission), creates the Organization and the User (`emailVerifiedAt: null`), generates a 6-digit OTP, and emails it.
   - **Success** → backend returns success. Frontend advances to Step 3 (Verify Email OTP).
   - **GST Number taken** (race) → error response; frontend returns the user to Step 1 with the conflict shown inline.
   - **Email already registered** → error response; frontend shows it as a Step 2 field error (see [Open Questions](#open-questions--assumptions) on why this is not generic, unlike login/forgot-password).
5. Any unexpected server error → generic error toast, user stays on Step 2.
6. The user can click **"← Back"** to return to Step 1; the previously entered Organization Name and GST Number are preserved so they don't need retyping.

**Validation Rules**

| Field | Rule |
|-------|------|
| First Name / Last Name | Required, 1–50 characters, letters/spaces/hyphen/apostrophe only: `^[A-Za-z' -]{1,50}$` |
| Email | Required. Must match `^[^\s@]+@[^\s@]+\.[^\s@]+$`. Must be unique across all users regardless of verification state. |
| Password | Required. Must satisfy `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$` (min 8 chars, upper, lower, digit, special char) — identical policy to 001's Reset Password step. |
| Confirm Password | Required. Must exactly match Password (frontend-only check). |

**Acceptance Criteria**

- **Given** all fields valid and the email is not already registered, **when** the user submits, **then** an OTP is emailed to that address and the UI advances to Step 3.
- **Given** a Password that does not meet the strength policy, **when** the user attempts to submit, **then** the form is blocked client-side with an inline error describing the unmet rule(s).
- **Given** a Confirm Password that does not match Password, **when** the user attempts to submit, **then** the form is blocked client-side with an inline "passwords do not match" error.
- **Given** an email that is already registered, **when** the user submits, **then** the backend rejects the request and the frontend shows an inline "email already registered" error on the Email field; the user remains on Step 2 with Step 1's data intact.
- **Given** a server/network error, **when** the user submits valid data, **then** an error toast is shown and the user remains on Step 2.
- **Given** the user is on Step 2, **when** they click "← Back", **then** they are returned to Step 1 with their previously entered Organization Name and GST Number pre-filled.

**Error / Toast Messages**

| Scenario | Message |
|----------|---------|
| Email already registered | "An account with this email already exists." (inline field error) |
| GST number taken (race with Step 1) | "This GST number was just registered by someone else. Please start over." (toast, returns to Step 1) |
| OTP sent successfully | "Verification code sent to your email." |
| Server/network error | "Something went wrong. Please try again." |

---

### Step 3 — Verify Email OTP

**Screens & Fields**

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Register – Step 3 | OTP | text (numeric, 6 digits) | Yes |
| Register – Step 3 | Verify button | button | — |
| Register – Step 3 | Resend OTP link | link/button, disabled during cooldown | — |
| Register – Step 3 | "Wrong email? Start over" link | link → Step 1 (full restart) | — |

**Flow**

1. User enters the 6-digit OTP received by email and clicks Verify.
2. Frontend validates the OTP is exactly 6 numeric digits before calling the API.
3. Frontend calls the verify-email-OTP API.
   - **Correct and not expired** → backend marks the user's email verified and returns a short-lived `registrationToken` (~15 minutes). Frontend advances to Step 4 (Mobile Number).
   - **Incorrect** → error toast; user may retry.
   - **Expired** → "expired" error toast prompting resend.
4. **Resend OTP**: disabled for 30 seconds after each send (countdown shown), identical cooldown to 001. Re-triggers a new email OTP and restarts the 10-minute expiry.
5. This step **cannot be skipped** — it is the only mandatory verification in this flow.
6. Unlike Steps 1–2, there is no in-place "go back and edit the email" option here: the Organization and User records already exist by this point, keyed on that email. Clicking **"Wrong email? Start over"** clears all flow state and returns to Step 1 for a fresh registration attempt (see [Open Questions](#open-questions--assumptions) for why this is a restart rather than an edit).

**Validation Rules**

| Field | Rule |
|-------|------|
| OTP | Required, numeric only, exactly 6 digits. Expires 10 minutes after being sent (identical policy to 001). |

**Acceptance Criteria**

- **Given** a valid, unexpired OTP, **when** the user submits it, **then** the email is marked verified, a `registrationToken` is issued, and the UI advances to Step 4.
- **Given** an incorrect OTP, **when** the user submits it, **then** an error toast is shown and the user remains on Step 3.
- **Given** an OTP older than 10 minutes, **when** the user submits it, **then** an "OTP expired" toast is shown and the user is prompted to resend.
- **Given** the 30-second cooldown has elapsed, **when** the user clicks Resend OTP, **then** a new OTP is emailed and both the expiry timer and cooldown restart.
- **Given** the user is on Step 3, **when** they click "Wrong email? Start over", **then** all flow state is cleared and they are returned to Step 1 to register from scratch (the previous unverified account remains in place — see Open Questions).

**Error / Toast Messages**

| Scenario | Message |
|----------|---------|
| Incorrect OTP | "Invalid OTP. Please try again." |
| Expired OTP | "This OTP has expired. Please request a new one." |
| Resend success | "A new OTP has been sent to your email." |
| Server/network error | "Something went wrong. Please try again." |

---

### Step 4 — Mobile Number

**Screens & Fields**

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Register – Step 4 | Mobile Number | text (numeric) | Yes |
| Register – Step 4 | Skip button | button | — |
| Register – Step 4 | Save & Continue button | button | — |

**Flow**

1. User enters a Mobile Number. **Both** buttons stay disabled until the number passes client-side format validation — "required" here means the field must be filled in to proceed at all, not that verification is mandatory.
2. Frontend calls the save-mobile-number API with the `registrationToken` and the number, regardless of which button is clicked.
   - Mobile number already in use by another account → error shown inline on the field; neither button proceeds.
3. **Skip** clicked (after successful save): frontend immediately calls the Complete Registration API (see below) and redirects to the Dashboard. Mobile number is stored but `mobileVerifiedAt` stays null.
4. **Save & Continue** clicked (after successful save): frontend calls the send-mobile-OTP API and advances to Step 5.
5. Any unexpected server error on save → generic error toast, user stays on Step 4.
6. There is deliberately no "back"/"cancel" link on this screen: email verification (Step 3) is already complete and can't be undone, so there's no earlier step to return to. **Skip** is this screen's escape hatch from mobile *verification* only, not from providing a number — a valid, unused Mobile Number is still required before either button becomes enabled (see Validation Rules), so the only way forward is to enter one.

**Validation Rules**

| Field | Rule |
|-------|------|
| Mobile Number | Required. Must match `^(\+91)?[6-9]\d{9}$` (identical India phone format to 001). Must be unique across users (matches the existing `User.phone` unique constraint). |

**Acceptance Criteria**

- **Given** a valid, unused Mobile Number, **when** the user clicks Skip, **then** the number is saved unverified, a session is established via the Complete Registration API, and the user is redirected to the Dashboard.
- **Given** a valid, unused Mobile Number, **when** the user clicks Save & Continue, **then** the number is saved, an OTP is sent to it, and the UI advances to Step 5.
- **Given** an empty or malformed Mobile Number, **when** the user attempts either button, **then** both buttons remain disabled and an inline validation error is shown.
- **Given** a Mobile Number already used by another account, **when** the user attempts either button, **then** an inline "already in use" error is shown and neither button proceeds.

**Error / Toast Messages**

| Scenario | Message |
|----------|---------|
| Mobile number already in use | "This mobile number is already in use." (inline field error) |
| OTP sent successfully | "OTP sent to your mobile number." |
| Server/network error | "Something went wrong. Please try again." |

---

### Step 5 — Verify Mobile OTP

**Screens & Fields**

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Register – Step 5 | OTP | text (numeric, 6 digits) | Yes |
| Register – Step 5 | Skip button | button | — |
| Register – Step 5 | Save button | button | — |
| Register – Step 5 | Resend OTP link | link/button, disabled during cooldown | — |
| Register – Step 5 | "← Change mobile number" link | link → Step 4 | — |

**Flow**

1. **Skip** clicked (at any time, OTP field may be empty): frontend immediately calls the Complete Registration API and redirects to the Dashboard. Mobile number remains unverified.
2. User may instead enter the 6-digit OTP received by SMS and click **Save**.
3. Frontend validates the OTP is exactly 6 numeric digits before calling the API.
4. Frontend calls the verify-mobile-OTP API.
   - **Correct and not expired** → backend marks the mobile number verified. Frontend then calls the Complete Registration API and redirects to the Dashboard.
   - **Incorrect** → error toast; user may retry Save or click Skip instead.
   - **Expired** → "expired" error toast; user may Resend or click Skip instead.
5. **Resend OTP**: same 30-second cooldown / 10-minute expiry policy as email OTP, re-triggers the send-mobile-OTP API.
6. The user can click **"← Change mobile number"** to return to Step 4 and enter a different number — unlike email, the mobile number isn't yet verified at this point, so re-submitting it via `PUT /api/auth/registrations/mobile` is a safe, idempotent correction, not a restart.

**Validation Rules**

| Field | Rule |
|-------|------|
| OTP | Required only if the user chooses Save (not required for Skip), numeric only, exactly 6 digits, 10-minute expiry. |

**Acceptance Criteria**

- **Given** any state (OTP entered or not), **when** the user clicks Skip, **then** a session is established via the Complete Registration API and the user is redirected to the Dashboard with the mobile number left unverified.
- **Given** a valid, unexpired OTP, **when** the user clicks Save, **then** the mobile number is marked verified, a session is established via the Complete Registration API, and the user is redirected to the Dashboard.
- **Given** an incorrect OTP, **when** the user clicks Save, **then** an error toast is shown and the user remains on Step 5, still free to Skip.
- **Given** an OTP older than 10 minutes, **when** the user clicks Save, **then** an "OTP expired" toast is shown and the user is prompted to resend or skip.
- **Given** the user is on Step 5, **when** they click "← Change mobile number", **then** they are returned to Step 4 with the previously entered number pre-filled.

**Error / Toast Messages**

| Scenario | Message |
|----------|---------|
| Incorrect OTP | "Invalid OTP. Please try again." |
| Expired OTP | "This OTP has expired. Please request a new one." |
| Resend success | "A new OTP has been sent to your mobile number." |
| Server/network error | "Something went wrong. Please try again." |

---

### Completing Registration (session bootstrap)

Both "Skip" paths and the "Save" success path on Step 5 all funnel into one Complete Registration call (the "config" call), which is the only place a real session is issued.

- **Request**: `{ registrationToken }`.
- **Success**: sets the same httpOnly access-token cookie 001's Login uses, and returns `{ user, organization, accessToken, refreshToken }` in the JSON body. The `registrationToken` is single-use — consumed on success.
- **Failure** (expired/invalid `registrationToken`, e.g. the user left the tab open past ~15 minutes): error toast, user is sent back to Step 1. See [Open Questions](#open-questions--assumptions) for why this is an incomplete answer once the email is already verified.

---

## API Design

All endpoints are unauthenticated (pre-session) except Complete, which is the point a session begins. All are sub-resources of `registrations`, consistent with the `/api/auth/*` namespace 001 already established. GET is used only for the side-effect-free availability check; PUT for the idempotent "set this field" mobile-number call; POST for creation/actions.

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| GET | `/api/organizations/gst-availability?gstNumber=` | — (query param) | `{ available: boolean }` |
| POST | `/api/auth/registrations` | `{ organizationName, gstNumber, firstName, lastName, email, password, confirmPassword }` | `{ message, email }` |
| POST | `/api/auth/registrations/email-otp/resend` | `{ email }` | `{ message }` |
| POST | `/api/auth/registrations/email-otp/verify` | `{ email, otp }` | `{ registrationToken }` |
| PUT | `/api/auth/registrations/mobile` | `{ registrationToken, mobileNumber }` | `{ message }` |
| POST | `/api/auth/registrations/mobile-otp` | `{ registrationToken }` | `{ message }` |
| POST | `/api/auth/registrations/mobile-otp/verify` | `{ registrationToken, otp }` | `{ message }` |
| POST | `/api/auth/registrations/complete` | `{ registrationToken }` | `{ user, organization, accessToken, refreshToken }` (+ sets auth cookie) |

Error responses follow the existing convention (`{ error: string }`, appropriate HTTP status — 400 validation, 401 invalid/expired token, 409 conflict for duplicate GST/email/mobile, 500 unexpected).

---

## Validation Rules Summary

| Field type | Rule |
|------------|------|
| GST Number | `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`, uppercased before use |
| Organization Name | Required, 2–150 characters |
| First / Last Name | `^[A-Za-z' -]{1,50}$` |
| Email | `^[^\s@]+@[^\s@]+\.[^\s@]+$` (same as 001) |
| Phone (India) | `^(\+91)?[6-9]\d{9}$` (same as 001) |
| Password (strength) | `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$` (same as 001) |
| OTP (email or mobile) | `^\d{6}$`, 10-minute expiry, 30-second resend cooldown (same as 001) |

## Test Cases

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|------------------|
| TC-01 | Valid, unused GST + org name | Step 1: enter both, blur GST field | Availability check returns available; Continue enabled |
| TC-02 | GST already registered | Step 1: enter a taken GST | Inline "already registered" error; Continue stays disabled |
| TC-03 | Malformed GST | Step 1: enter e.g. `ABC123` | Blocked client-side, no API call |
| TC-04 | Empty organization name | Step 1: leave name blank | Blocked client-side with "required" error |
| TC-05 | Full valid Step 2 submit | Steps 1–2 valid, unique email | OTP emailed, advances to Step 3 |
| TC-06 | Duplicate email at Step 2 | Step 2: use an email that already has an account | 409, inline field error, stays on Step 2, Step 1 data intact |
| TC-07 | Weak password | Step 2: password missing a required character class | Blocked client-side, inline error |
| TC-08 | Password/confirm mismatch | Step 2: confirm ≠ password | Blocked client-side, inline "do not match" error |
| TC-09 | GST race condition | Two tabs pass Step 1 with the same GST, both reach Step 2 | Second submission gets 409 from the server-side re-check, bounced to Step 1 |
| TC-10 | Correct email OTP | Step 3: enter the emailed code | `registrationToken` issued, advances to Step 4 |
| TC-11 | Incorrect email OTP | Step 3: enter wrong code | Error toast, stays on Step 3 |
| TC-12 | Expired email OTP | Step 3: wait 10+ minutes, then submit | "Expired" toast, prompted to resend |
| TC-13 | Resend before cooldown elapses | Step 3: click Resend within 30s | Control disabled, countdown visible, no new send |
| TC-14 | Resend after cooldown | Step 3: click Resend after 30s | New OTP sent, expiry and cooldown both reset |
| TC-15 | Step 4 Skip with valid mobile | Step 4: enter valid unused number, click Skip | Number saved unverified, Complete called, redirected to Dashboard |
| TC-16 | Step 4 Save & Continue | Step 4: enter valid unused number, click Save & Continue | Number saved, mobile OTP sent, advances to Step 5 |
| TC-17 | Step 4 with mobile already in use | Step 4: enter a number tied to another account | Inline "already in use" error, neither button proceeds |
| TC-18 | Step 4 empty/invalid mobile | Step 4: leave blank or enter invalid format | Both buttons disabled, inline error |
| TC-19 | Step 5 Skip | Step 5: click Skip (OTP field empty) | Complete called, redirected to Dashboard, mobile stays unverified |
| TC-20 | Step 5 Save with correct OTP | Step 5: enter correct code, click Save | Mobile marked verified, Complete called, redirected to Dashboard |
| TC-21 | Step 5 Save with incorrect OTP | Step 5: enter wrong code, click Save | Error toast, stays on Step 5, Skip still available |
| TC-22 | Step 5 Save with expired OTP | Step 5: wait 10+ minutes, click Save | "Expired" toast, can resend or skip |
| TC-23 | Full happy path, both verified | Complete all 5 steps verifying both email and mobile | `complete` response contains `user`, `organization`, `accessToken`, `refreshToken`; session cookie set |
| TC-24 | Full happy path, mobile skipped | Complete Steps 1–3, skip at Step 4 | Same as TC-23 but organization/user reflects unverified mobile |
| TC-25 | Back navigation, Step 2 → Step 1 | Step 2: click "← Back" | Returned to Step 1, Organization Name/GST pre-filled |
| TC-26 | Start over, Step 3 → Step 1 | Step 3: click "Wrong email? Start over" | Flow state cleared, returned to Step 1 as a fresh attempt |
| TC-27 | Back navigation, Step 5 → Step 4 | Step 5: click "← Change mobile number" | Returned to Step 4, previous number pre-filled, can submit a different one |
| TC-28 | Login link from Step 1 | Step 1: click "Already have an account? Log in" | Navigated to Login, no API calls made |

## Edge Cases

- **Browser refresh mid-flow**: frontend state (Organization Name/GST at Steps 1–2, `registrationToken` at Steps 4–5) lives in a route-scoped context, same pattern as 001's Forgot Password steps. A refresh loses it — Steps 2–5 must detect missing required state and bounce back to Step 1, mirroring 001's guard behavior.
- **GST/email uniqueness races**: the live Step 1 check and the Step 2 submit are separate requests: another signup can claim the same GST or email in between. The server re-validates at submission time regardless of what Step 1's check reported (TC-09).
- **`registrationToken` expiry after email is already verified**: unlike a fresh restart, the account already exists with a verified email by the time Steps 4/5 are reached. Restarting at Step 1 would now fail with a duplicate-email 409. See the resolution proposed in Open Questions.
- **Mobile number collision**: the existing `User.phone` unique constraint (from 001) means a mobile number already tied to another account — verified or not — must be rejected with a specific, non-generic error (unlike login/forgot-password, revealing this isn't a security concern; the user is actively claiming a resource, not probing an existing account).
- **Case/format normalization**: GST Number is uppercased and email is lowercased before comparison and storage, so uniqueness checks aren't defeated by casing differences.
- **Back-navigation after landing on the Dashboard**: once Complete has run and a session cookie exists, navigating back into `/register/*` routes should not be able to resume or restart the wizard (same route-protection posture as 001's `/dashboard`).
- **Abandoned unverified registrations**: a user who never completes Step 3 leaves a `User` row with `emailVerifiedAt: null` occupying that email/GST permanently under the current design — see Open Questions.
- **No dead ends**: every screen must have an explicit way out (back to a previous step and/or to Login) rather than relying on the browser's back button — this was missed in 001's first pass and had to be retrofitted; this story bakes it in from the start (see the Screens & Fields "link" rows on every step).
- **Pre-existing users predate organizations**: every `User` row created under 001, before this story's organization model existed, has no organization membership — see Open Questions for the default-organization backfill that resolves this.

## Out of Scope

- Real government GSTIN verification (format validity + database uniqueness only — no third-party/government API check).
- Multi-user organizations or inviting teammates — this story creates exactly one owner-user per organization.
- An existing, logged-in user creating or joining a **second** organization, and any "switch organization" UI — this story only covers a brand-new user's very first organization. (The data model must not preclude this later; see Open Questions.)
- Editing or deleting an organization/account after signup.
- Rate limiting or lockout after repeated failed OTP/availability attempts (same exclusion as 001).
- Payment/billing setup as part of signup.

## Open Questions / Assumptions

- **`User`↔`Organization` must be modeled many-to-many, not a scalar FK**: the product invariant is that every user belongs to at least one organization, and may belong to more than one — this story is just the first time that membership is ever created. That means the schema needs an `organization_members` (or similarly named) join table — e.g. `organizationId`, `userId`, `role`, `joinedAt` — rather than a single `organizationId` column on `User`, even though this story only ever inserts exactly one membership row per new user. Shipping the scalar-FK version now to save time would require a breaking migration and data backfill the moment a later story (inviting a user into a second organization, or letting a user create an additional one) needs it. No multi-organization UI (switching, adding, inviting into a second org) is built as part of this story — only the schema and the `complete` response's `organization` field need to already assume "one of possibly several," e.g. by treating it as the user's *current/active* organization rather than *the* organization. Confirm this data model before implementation begins, since it changes the migration and the `User`/`Organization` model code from what a naive reading of this story's flow would suggest. **Backfill resolution**: the same migration seeds one default organization named **Smartsense** and adds every user that already exists in the database at migration time (i.e. every account created under 001's user-only model, before organizations existed — including the demo/seed users) as a member of it. This satisfies the "every user belongs to at least one organization" invariant for pre-existing data immediately, without requiring those accounts to run through this signup wizard retroactively.
- **Refresh tokens are new to the system**: 001's Login only ever issued an httpOnly access-token cookie, no refresh token. This story introduces one because it was explicitly requested. Whether Login (001) should be retrofitted to match, and the refresh token's own expiry/rotation/revocation policy, is not decided here and should be confirmed before implementation.
- **Recovering from an expired `registrationToken`**: once email is verified, the account already exists (with a set password) but Steps 4/5 can no longer be reached if the token times out and the user can't restart from Step 1 (duplicate email). Proposed resolution: let the user log in normally via 001's Login story instead — this assumes Login does **not** require mobile verification to succeed, and mobile-number capture would need a separate "complete your profile" entry point reachable post-login. Needs confirmation.
- **Lifecycle of abandoned unverified registrations**: no expiry/cleanup policy is defined for a `User` row whose email is never verified, meaning that email/GST pair is permanently unavailable to retry with. Whether to add a TTL and reclaim the email/GST is unresolved.
- **Organization Name uniqueness**: assumed *not* required to be unique (only GST Number is, per the request) — two organizations could share a display name.
- **Step 3 "Start over" leaves an orphaned unverified account**: since email can't be edited in place once the account exists, "Wrong email? Start over" restarts at Step 1 but doesn't delete the abandoned `User`/`Organization` row from the mistyped attempt. Combined with the "abandoned unverified registrations" question above, this means a single user could accumulate multiple unverified rows across retries. Whether to actively delete the previous attempt when "Start over" is clicked (trading a bit of complexity for a cleaner table) is unresolved.
