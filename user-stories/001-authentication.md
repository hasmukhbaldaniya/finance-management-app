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

**Flow**

1. User enters their Email and submits.
2. Frontend validates the email format client-side; blocks submit if invalid.
3. Frontend calls backend "request OTP" API with the email.
4. Backend checks whether the email belongs to a registered user:
   - **Exists** → backend generates a 6-digit OTP, stores it with an expiry, emails it to the user, and returns success. Frontend advances to Step 2.
   - **Does not exist** → see [Open Questions](#open-questions--assumptions) — exact response behavior (generic vs. explicit "not found") is not finalized yet.
5. Server/network error → generic error toast, user stays on Step 1.

**Validation Rules**

| Field | Rule |
|-------|------|
| Email | Required, must match email format (see summary table). |

**Acceptance Criteria**

- **Given** a registered email, **when** the user submits it, **then** an OTP is emailed to that address and the UI advances to Step 2 (Verify OTP).
- **Given** an empty or malformed email, **when** the user attempts to submit, **then** the form is blocked client-side with an inline validation error.
- **Given** a server/network error, **when** the user submits a valid email, **then** an error toast is shown and the user remains on Step 1.

**Error / Toast Messages**

| Scenario | Message |
|----------|---------|
| Email not registered | *TBD — see Open Questions* |
| Server/network error | "Something went wrong. Please try again." |
| OTP sent successfully | "OTP sent to your email." |

### Step 2 — Verify OTP

**Screens & Fields**

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Forgot Password – Step 2 | OTP | text (numeric, 6 digits) | Yes |
| Forgot Password – Step 2 | Verify button | button | — |
| Forgot Password – Step 2 | Resend OTP link | link/button, disabled during cooldown | — |

**Flow**

1. User enters the 6-digit OTP received by email and clicks **Verify**.
2. Frontend validates the OTP is exactly 6 numeric digits before calling the API.
3. Frontend calls backend "verify OTP" API.
   - **Correct and not expired** → backend returns success (+ a short-lived reset token). Frontend advances to Step 3 (Reset Password).
   - **Incorrect** → backend returns an error; frontend shows a toast; user may retry.
   - **Expired** → backend returns an "expired" error; frontend shows a toast prompting the user to resend.
4. **Resend OTP**: disabled for 30 seconds after each send (countdown shown). When enabled and clicked, re-triggers the Step 1 "request OTP" API for the same email and restarts the OTP expiry.
5. OTP expires 10 minutes after being sent.

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

**Error / Toast Messages**

| Scenario | Message |
|----------|---------|
| Incorrect OTP | "Invalid OTP. Please try again." |
| Expired OTP | "This OTP has expired. Please request a new one." |
| Resend success | "A new OTP has been sent to your email." |
| Server/network error | "Something went wrong. Please try again." |

### Step 3 — Reset Password

**Screens & Fields**

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Forgot Password – Step 3 | New Password | password (masked, show/hide toggle) | Yes |
| Forgot Password – Step 3 | Confirm Password | password (masked, show/hide toggle) | Yes |
| Forgot Password – Step 3 | Submit button | button | — |

**Flow**

1. User enters New Password and Confirm Password, clicks Submit.
2. Frontend validates both fields client-side (strength rule on New Password, equality check against Confirm Password) before calling the API.
3. Frontend calls backend "reset password" API with the new password and the reset token obtained in Step 2.
   - **Success** → backend updates the password, invalidates the reset token and any outstanding OTP. Frontend shows a success toast and redirects to the Login screen.
   - **Failure** (e.g. reset token expired/invalid) → error toast; user is sent back to Step 1 to restart the flow.

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

## Out of Scope

- Signup / account registration (assumed the user already exists).
- Social login (Google/Apple/etc.).
- "Remember me" / persistent session beyond the default session lifetime.
- Account lockout or rate-limiting after repeated failed login or OTP attempts.
- Forgot password via phone/SMS OTP (this story only sends OTP by email, per the described flow).

## Open Questions / Assumptions

- **Account enumeration on Forgot Password Step 1**: this doc currently leaves the "email not found" response as TBD. Security best practice is a generic response regardless of whether the email exists (e.g. "If this email is registered, an OTP has been sent."), rather than an explicit "email not found" message. Needs a decision before backend implementation.
- **Session/token strategy** for a successful login (JWT vs. server-side session/cookie) is not specified here — deferred to the implementation plan.
- **Rate limiting** on login attempts and OTP requests/verification is not specified — should be decided before implementation to prevent brute-force abuse.
- **Reset token transport** for Step 2 → Step 3 (e.g. short-lived JWT vs. server-side session tied to the verified OTP) is not specified — deferred to implementation.
