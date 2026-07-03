# 001 - Authentication

**Status:** Draft
**Epic:** Authentication

## Overview

Covers how an existing user gets into the app: logging in with either their email or phone number plus password, and recovering access via a 3-step "forgot password" flow (request OTP by email → verify OTP → set a new password). Account creation/signup is not covered here — see Out of Scope.

---

## Story: Login

**As a** registered user
**I want** to log in with my email or phone number and password
**So that** I can access my dashboard

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Login | Identifier (Email or Phone Number) | text | Yes |
| Login | Password | password (masked, with show/hide toggle) | Yes |
| Login | Login button | button | — |
| Login | "Forgot password?" link | link → Forgot Password Step 1 | — |

### Flow

1. User enters Identifier and Password, clicks **Login**.
2. Frontend runs client-side validation (see below). If invalid, block submit and show inline field errors — no API call.
3. Frontend calls backend login API with the identifier + password.
4. Backend looks up the user by email or phone, verifies the password hash.
   - **Correct** → backend returns success (+ session/auth token). Frontend redirects to the Dashboard page.
   - **Incorrect** (wrong password, or identifier not found) → backend returns an error response with a message. Frontend shows that message as a toast. The user stays on the Login screen.
5. Any unexpected server error → backend returns a generic error; frontend shows a generic toast.

### Validation Rules

| Field | Rule |
|-------|------|
| Identifier | Required. Must match either the email format or the India mobile format (see [Validation Rules Summary](#validation-rules-summary)). |
| Password | Required, non-empty. Strength rules are **not** re-checked at login time — they apply only when a password is created/reset (see Reset Password step). |

### Acceptance Criteria

- **Given** a registered user with valid credentials, **when** they submit Identifier + Password, **then** they are redirected to the Dashboard.
- **Given** a registered user, **when** they submit the correct identifier with a wrong password, **then** the backend rejects the request and the frontend shows an error toast with the backend's message; the user remains on the Login screen.
- **Given** an identifier that doesn't match any user, **when** they submit, **then** the backend rejects the request and the frontend shows an error toast; the message does not reveal whether the identifier exists or the password was wrong (avoids account enumeration).
- **Given** an Identifier that is neither a valid email nor a valid India phone number, **when** the user attempts to submit, **then** the form is blocked client-side with an inline validation error and no API call is made.
- **Given** an empty Identifier or Password field, **when** the user attempts to submit, **then** the form is blocked client-side with inline "required" errors.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Wrong password or unknown identifier | "Invalid email/phone number or password." |
| Server/network error | "Something went wrong. Please try again." |

---

## Story: Forgot Password

**As a** registered user who forgot their password
**I want** to reset it using an OTP sent to my email
**So that** I can regain access to my account without contacting support

This is a 3-step flow, each step its own screen.

### Step 1 — Request OTP

**Screens & Fields**

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Forgot Password – Step 1 | Email | text (email) | Yes |
| Forgot Password – Step 1 | Submit button | button | — |
| Forgot Password – Step 1 | "Back to Login" link | link → Login | — |

**Flow**

1. User enters their Email and submits.
2. Frontend validates the email format client-side; blocks submit if invalid.
3. Frontend calls backend "request OTP" API with the email.
4. Backend checks whether the email belongs to a registered user:
   - **Exists** → backend generates a 6-digit OTP, stores it with an expiry, emails it to the user, and returns success. Frontend advances to Step 2.
   - **Does not exist** → backend returns 404 with an explicit "not registered" message (see [Open Questions](#open-questions--assumptions) for the account-enumeration trade-off this implies); frontend shows it as an error toast and the user stays on Step 1.
5. Server/network error → generic error toast, user stays on Step 1.
6. At any point, the user can click **"Back to Login"** to leave the flow and return to the Login screen.

**Validation Rules**

| Field | Rule |
|-------|------|
| Email | Required, must match email format (see summary table). |

**Acceptance Criteria**

- **Given** a registered email, **when** the user submits it, **then** an OTP is emailed to that address and the UI advances to Step 2 (Verify OTP).
- **Given** an empty or malformed email, **when** the user attempts to submit, **then** the form is blocked client-side with an inline validation error.
- **Given** a server/network error, **when** the user submits a valid email, **then** an error toast is shown and the user remains on Step 1.
- **Given** an email that is not registered, **when** the user submits it, **then** an error toast with an explicit "not registered" message is shown and the user remains on Step 1.
- **Given** the user is on Step 1, **when** they click "Back to Login", **then** they are navigated to the Login screen.

**Error / Toast Messages**

| Scenario | Message |
|----------|---------|
| Email not registered | "This email is not registered." |
| Server/network error | "Something went wrong. Please try again." |
| OTP sent successfully | "An OTP has been sent to your email." |

### Step 2 — Verify OTP

**Screens & Fields**

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Forgot Password – Step 2 | OTP | text (numeric, 6 digits) | Yes |
| Forgot Password – Step 2 | Verify button | button | — |
| Forgot Password – Step 2 | Resend OTP link | link/button, disabled during cooldown | — |
| Forgot Password – Step 2 | "← Change email" link | link → Step 1 | — |
| Forgot Password – Step 2 | "Back to Login" link | link → Login | — |

**Flow**

1. User enters the 6-digit OTP received by email and clicks **Verify**.
2. Frontend validates the OTP is exactly 6 numeric digits before calling the API.
3. Frontend calls backend "verify OTP" API.
   - **Correct and not expired** → backend returns success (+ a short-lived reset token). Frontend advances to Step 3 (Reset Password).
   - **Incorrect** → backend returns an error; frontend shows a toast; user may retry.
   - **Expired** → backend returns an "expired" error; frontend shows a toast prompting the user to resend.
4. **Resend OTP**: disabled for 30 seconds after each send (countdown shown). When enabled and clicked, re-triggers the Step 1 "request OTP" API for the same email and restarts the OTP expiry.
5. OTP expires 10 minutes after being sent.
6. The user can click **"← Change email"** to return to Step 1 (the previously entered email is preserved so it doesn't need retyping), or **"Back to Login"** to leave the flow entirely.

**Validation Rules**

| Field | Rule |
|-------|------|
| OTP | Required, numeric only, exactly 6 digits. |

**Acceptance Criteria**

- **Given** a valid, unexpired OTP, **when** the user submits it, **then** the UI advances to Step 3 (Reset Password).
- **Given** an incorrect OTP, **when** the user submits it, **then** an error toast is shown and the user remains on Step 2.
- **Given** an OTP older than 10 minutes, **when** the user submits it, **then** an "OTP expired" toast is shown and the user is prompted to resend.
- **Given** the OTP was just sent (< 30 seconds ago), **when** the user views Step 2, **then** the Resend OTP control is disabled with a visible countdown.
- **Given** the 30-second cooldown has elapsed, **when** the user clicks Resend OTP, **then** a new OTP is emailed, the expiry timer resets, and the cooldown restarts.
- **Given** the user is on Step 2, **when** they click "← Change email", **then** they are returned to Step 1 with their previously entered email pre-filled.
- **Given** the user is on Step 2, **when** they click "Back to Login", **then** they are navigated to the Login screen and the in-progress flow state is cleared.

**Error / Toast Messages**

| Scenario | Message |
|----------|---------|
| Incorrect OTP | "Invalid OTP. Please try again." |
| Expired OTP | "This OTP has expired. Please request a new one." |
| Resend success | "An OTP has been sent to your email." (resend re-triggers the same request-OTP endpoint as Step 1, so it returns the identical message — not a distinct "new OTP" string) |
| Server/network error | "Something went wrong. Please try again." |

### Step 3 — Reset Password

**Screens & Fields**

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Forgot Password – Step 3 | New Password | password (masked, show/hide toggle) | Yes |
| Forgot Password – Step 3 | Confirm Password | password (masked, show/hide toggle) | Yes |
| Forgot Password – Step 3 | Submit button | button | — |
| Forgot Password – Step 3 | "← Back" link | link → Step 2 | — |
| Forgot Password – Step 3 | "Back to Login" link | link → Login | — |

**Flow**

1. User enters New Password and Confirm Password, clicks Submit.
2. Frontend validates both fields client-side (strength rule on New Password, equality check against Confirm Password) before calling the API.
3. Frontend calls backend "reset password" API with the new password and the reset token obtained in Step 2.
   - **Success** → backend updates the password, invalidates the reset token and any outstanding OTP. Frontend shows a success toast and redirects to the Login screen.
   - **Failure** (e.g. reset token expired/invalid) → error toast; user is sent back to Step 1 to restart the flow.
4. The user can click **"← Back"** to return to Step 2 (re-verify the OTP; this is a safe no-op since verifying doesn't consume the OTP), or **"Back to Login"** to leave the flow entirely.

**Validation Rules**

| Field | Rule |
|-------|------|
| New Password | Required. Must satisfy the strong password policy (see summary table). |
| Confirm Password | Required. Must exactly match New Password. |

**Acceptance Criteria**

- **Given** a New Password meeting the strength policy and a matching Confirm Password, **when** the user submits, **then** the password is updated, a success toast is shown, and the user is redirected to Login.
- **Given** a New Password that does not meet the strength policy, **when** the user attempts to submit, **then** the form is blocked client-side with an inline validation error describing the unmet rule(s).
- **Given** a Confirm Password that does not match New Password, **when** the user attempts to submit, **then** the form is blocked client-side with an inline "passwords do not match" error.
- **Given** the reset token/OTP session has expired or is invalid by the time of submission, **when** the user submits, **then** an error toast is shown and the user is returned to Step 1.
- **Given** the user is on Step 3, **when** they click "← Back", **then** they are returned to Step 2.
- **Given** the user is on Step 3, **when** they click "Back to Login", **then** they are navigated to the Login screen and the in-progress flow state is cleared.

**Error / Toast Messages**

| Scenario | Message |
|----------|---------|
| Reset token expired/invalid | "Your session has expired. Please start over." |
| Success | "Password reset successful. Please log in." |
| Server/network error | "Something went wrong. Please try again." |

---

## Validation Rules Summary

| Field type | Rule |
|------------|------|
| Email | Standard email format, e.g. `^[^\s@]+@[^\s@]+\.[^\s@]+$` |
| Phone (India) | 10 digits starting with 6–9, optional `+91` prefix, e.g. `^(\+91)?[6-9]\d{9}$` |
| Password (strength, applies to New Password only — not login) | Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character, e.g. `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$` |
| OTP | Exactly 6 numeric digits, e.g. `^\d{6}$` |

## Test Cases

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|------------------|
| TC-01 | Valid login via email | Login: enter registered email + correct password, click Login | Redirected to Dashboard |
| TC-02 | Valid login via phone | Login: enter registered India phone number + correct password, click Login | Redirected to Dashboard |
| TC-03 | Wrong password | Login: enter registered identifier + incorrect password | "Invalid email/phone number or password." toast; stays on Login |
| TC-04 | Unknown identifier | Login: enter an identifier with no matching account | Same "Invalid email/phone number or password." toast as TC-03 (no enumeration); stays on Login |
| TC-05 | Malformed identifier | Login: enter e.g. `not-an-email-or-phone` | Blocked client-side with inline error, no API call |
| TC-06 | Empty identifier or password | Login: leave one or both fields blank, click Login | Blocked client-side with inline "required" errors, no API call |
| TC-07 | Server/network error at login | Login: submit valid-looking credentials while the backend is unreachable | Generic error toast; stays on Login |
| TC-08 | Registered email requests OTP | Forgot Password Step 1: enter a registered email, submit | OTP emailed; advances to Step 2 |
| TC-09 | Unregistered email requests OTP | Forgot Password Step 1: enter an email with no account | 404 "This email is not registered." toast; stays on Step 1 |
| TC-10 | Malformed email at Step 1 | Forgot Password Step 1: enter e.g. `foo@bar` | Blocked client-side with inline error, no API call |
| TC-11 | Server/network error at Step 1 | Forgot Password Step 1: submit a valid email while the backend is unreachable | Generic error toast; stays on Step 1 |
| TC-12 | "Back to Login" from Step 1 | Forgot Password Step 1: click "Back to Login" | Navigated to Login |
| TC-13 | Correct, unexpired OTP | Forgot Password Step 2: enter the emailed code, click Verify | Advances to Step 3 |
| TC-14 | Incorrect OTP | Forgot Password Step 2: enter a wrong 6-digit code | "Invalid OTP. Please try again." toast; stays on Step 2 |
| TC-15 | Expired OTP | Forgot Password Step 2: wait 10+ minutes, then submit the original code | "This OTP has expired." toast; prompted to resend |
| TC-16 | Resend before cooldown elapses | Forgot Password Step 2: click Resend within 30s of the last send | Control stays disabled with a visible countdown; no new OTP sent |
| TC-17 | Resend after cooldown | Forgot Password Step 2: click Resend after 30s | New OTP emailed; expiry and cooldown both reset |
| TC-18 | "← Change email" from Step 2 | Forgot Password Step 2: click "← Change email" | Returned to Step 1 with the previously entered email pre-filled |
| TC-19 | "Back to Login" from Step 2 | Forgot Password Step 2: click "Back to Login" | Navigated to Login; in-progress flow state cleared |
| TC-20 | Valid password reset | Forgot Password Step 3: enter a New Password meeting the strength policy and a matching Confirm Password, submit | Password updated; success toast; redirected to Login |
| TC-21 | Weak new password | Forgot Password Step 3: enter a password missing a required character class | Blocked client-side with inline error describing the unmet rule(s) |
| TC-22 | Confirm password mismatch | Forgot Password Step 3: Confirm Password ≠ New Password | Blocked client-side with inline "passwords do not match" error |
| TC-23 | Expired/invalid reset session at submit | Forgot Password Step 3: wait for the reset token to expire (or reuse an already-consumed one), then submit | Error toast; returned to Step 1 |
| TC-24 | "← Back" from Step 3 | Forgot Password Step 3: click "← Back" | Returned to Step 2 (OTP re-verification is a safe no-op) |
| TC-25 | "Back to Login" from Step 3 | Forgot Password Step 3: click "Back to Login" | Navigated to Login; in-progress flow state cleared |

## Edge Cases

- **Browser refresh mid-flow**: the Forgot Password flow's in-progress state (the email from Step 1, feeding Steps 2–3) lives in a route-scoped frontend context, not the URL or a server session. A refresh on Step 2 or Step 3 loses it — those screens must detect the missing email/reset-token and bounce the user back to Step 1 rather than rendering in a broken half-state.
- **Resend OTP invalidates the previous one**: Resend re-triggers the same request-OTP call as Step 1, so the OTP that was emailed earlier becomes stale the moment a new one is sent. Submitting the older code should behave identically to "incorrect OTP" (TC-14), not surface a distinct error.
- **Verifying an OTP does not consume it**: Step 3's "← Back" link relies on this — a user can return to Step 2 and re-verify the same code without it being treated as already used (TC-24). The only thing actually single-use is the reset token issued *after* verification, and both the reset token and any outstanding OTP are invalidated together the moment Step 3 succeeds.
- **Two tabs racing the same reset**: if a user has Forgot Password open in two tabs for the same email and completes the reset in one, the other tab's reset token/OTP is invalidated by that success. The second tab's next action (Verify or Submit) must fail via the same "expired/invalid" path as TC-15/TC-23, not a different error.
- **Login and Forgot Password deliberately disagree on enumeration**: Login intentionally returns the identical message whether the identifier is unknown or the password is wrong (TC-03/TC-04), while Forgot Password Step 1 intentionally does the opposite and states outright that the email isn't registered (TC-09). This asymmetry is a deliberate, already-made trade-off (see [Open Questions](#open-questions--assumptions)), not an inconsistency to "fix" — the two screens should not be made to match each other.
- **India-only phone format**: the Identifier field only recognizes India-formatted numbers (`^(\+91)?[6-9]\d{9}$`); a correctly-formatted phone number from another country is indistinguishable from a typo and is rejected client-side as malformed (TC-05), with no messaging that specifically calls out the country restriction.
- **Returning to `/forgot-password` after "Back to Login"**: since "Back to Login" explicitly clears flow state (TC-19/TC-25), a user who navigates back to the Forgot Password URL afterward (e.g. via browser history) must land on a fresh Step 1, never resuming the cleared flow — the same guard as the browser-refresh case above.

## Out of Scope

- Signup / account registration (assumed the user already exists).
- Social login (Google/Apple/etc.).
- "Remember me" / persistent session beyond the default session lifetime.
- Account lockout or rate-limiting after repeated failed login or OTP attempts.
- Forgot password via phone/SMS OTP (this story only sends OTP by email, per the described flow).

## Open Questions / Assumptions

- **Account enumeration on Forgot Password Step 1 — resolved**: implemented as an explicit "This email is not registered." response (404) rather than a generic message, prioritizing user-friendly feedback over anti-enumeration hardening. This is a deliberate trade-off made during implementation, not the security best practice originally recommended here — revisit if this flow ever becomes a target for account discovery.
- **Session/token strategy — resolved**: implemented as a JWT in an httpOnly, `SameSite=Lax` cookie, issued on login (password reset does not itself establish a session — the user logs in afterward, per the Reset Password success flow above).
- **Rate limiting** on login attempts and OTP requests/verification is not specified — should be decided before implementation to prevent brute-force abuse.
- **Reset token transport — resolved**: implemented as a short-lived JWT (10 minutes) returned to the frontend after OTP verification, carried in-memory through Step 3's submission — not a server-side session.
- **Navigation/back-out affordances**: every screen in the Forgot Password flow now has an explicit "Back to Login" (and, for Steps 2–3, a "← Back" to the previous step) link rather than relying on the browser's back button — added after this was found missing during manual testing. See the updated convention in `user-stories/README.md`; new multi-step stories should specify this up front instead of retrofitting it.
