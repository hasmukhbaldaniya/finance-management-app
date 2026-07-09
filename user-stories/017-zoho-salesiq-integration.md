# 017 - Zoho SalesIQ Integration

**Status:** Draft
**Epic:** Zoho SalesIQ Integration

## Overview

Adds a live-chat support widget (Zoho SalesIQ) to the authenticated app, so any logged-in employee can start a conversation with support without leaving whatever screen they're on. Today `frontend/src/app/(private)/help/page.tsx` is a bare `<ComingSoon title="Help" />` placeholder — this story gives that page (and the rest of the private area) a real, working support channel.

**This is a frontend-only integration.** Zoho SalesIQ is a third-party embedded widget (a `<script>` snippet plus a small JS API for visitor identification) — there's no new backend table, endpoint, or webhook in this story. The only backend-adjacent artifact is a new frontend env var holding the organization's full SalesIQ loader-script URL.

**Scoping decisions below were proposed and not yet confirmed by the product owner** — this doc proceeds with the recommended default at each decision point so implementation isn't blocked, but each is flagged again in [Open Questions](#open-questions--assumptions) and should be signed off before/during implementation:
- The widget loads app-wide across the authenticated `(private)/` area (every page under `dashboard/`, `trips/`, `claims/`, `approvals/`, `finance/`, `reports/`, `company-settings/*`, `profile/`, `help/`), not just on the Help page, and **not** on public/unauthenticated pages (`login/`, `register/*`, `forgot-password/*`, `onboarding/*`).
- The logged-in employee's name, email, and organization name are passed to SalesIQ so support agents see a real identity instead of an anonymous visitor.
- One organization-wide widget URL, set via a single frontend env var — not a per-organization value a Company Administrator can configure in Company Settings.

---

## Story: Load the SalesIQ Widget App-Wide

**As a** logged-in employee
**I want** a support chat widget available wherever I am in the app
**So that** I can get help without hunting for a specific "Contact Support" page

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Global (every page under `(private)/`) | Floating chat launcher (Zoho SalesIQ widget) | third-party embedded widget, bottom-right corner (Zoho's default position) | — |

### Flow

1. `(private)/layout.tsx`'s `SessionProvider` — already the one place that fetches the logged-in employee's identity via `getMe()` before rendering any private page — is also where the SalesIQ embed script loads, once per session, after that identity is available. This mirrors how `SessionProvider` already centralizes `getMe()` so individual pages don't each re-fetch it (see `frontend/CLAUDE.md`'s `SessionContext` section).
2. The widget script loads asynchronously and does not block page render — the rest of the app is fully usable before (and if) SalesIQ finishes loading.
3. Once loaded, the widget shows its floating launcher bubble in the bottom-right corner on every authenticated page; clicking it opens the chat panel. Navigating between pages (client-side routing) does not reload or reset the widget — it persists across route changes, the same way `Header` already does as a `SessionProvider`-level component.
4. **If the SalesIQ script fails to load** (network blocked, ad-blocker, Zoho outage, `NEXT_PUBLIC_ZOHO_SALESIQ_WIDGET_URL` unset), the app continues to function normally with no floating launcher and no error shown to the user — a missing support-chat widget is a degraded, non-blocking experience, not an application error.
5. The widget does **not** load on any `(public)/` page (login, register, forgot-password, onboarding) — those routes never mount `SessionProvider`, so there's nothing to hook the load into without also duplicating session-independent loading logic those pages don't otherwise need (see [Out of Scope](#out-of-scope)).

### Validation Rules

Not applicable — this story has no form fields or user-submitted data.

### Acceptance Criteria

- **Given** a logged-in employee on any `(private)/` page, **when** the page finishes loading, **then** the SalesIQ floating launcher appears (assuming the widget code is configured and Zoho's script loads successfully).
- **Given** the employee navigates from one private page to another, **when** the navigation completes, **then** the widget remains available without visibly reloading.
- **Given** `NEXT_PUBLIC_ZOHO_SALESIQ_WIDGET_URL` is unset or the script fails to load, **when** any private page renders, **then** the rest of the app works normally and no error is shown.
- **Given** a logged-out visitor on `/login` or `/register`, **when** the page loads, **then** no SalesIQ widget appears.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| SalesIQ script fails to load | None — fails silently, no toast, no inline error (see Flow point 4) |

---

## Story: Identify the Visitor to Support Agents

**As a** support agent using Zoho SalesIQ
**I want to** see who I'm chatting with
**So that** I don't have to ask for a name/email before helping

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| SalesIQ chat panel (agent-facing, inside Zoho's own product, not this app) | Visitor Name | pre-filled from the employee's session | — |
| SalesIQ chat panel (agent-facing) | Visitor Email | pre-filled from the employee's session | — |
| SalesIQ chat panel (agent-facing) | Organization (custom visitor field) | pre-filled from the employee's session | — |

### Flow

1. Once `SessionProvider`'s `getMe()` resolves (the same call that already populates `SessionContext`'s `user`/`organization`), the widget is told the visitor's name (`user.name`), email (`user.email`), and organization name (`organization.name`) via SalesIQ's visitor-identification JS API.
2. This identification happens once per session load, the same lifecycle point `SessionContext` already uses — it does not re-run on every route change, only when the identity first becomes available (or changes, e.g. after a fresh login).
3. Phone number and GST number are deliberately **not** passed — only what's useful for a support agent to greet the right person, minimizing what's shared with a third party (see [Out of Scope](#out-of-scope)).
4. If `getMe()` hasn't resolved yet (still loading) when the SalesIQ script finishes loading first, identification is applied as soon as the identity becomes available — the two loads are independent and may complete in either order.

### Validation Rules

Not applicable — data passed through is already-validated session data, not user input collected by this story.

### Acceptance Criteria

- **Given** a logged-in employee starts a chat, **when** a support agent opens the conversation in Zoho SalesIQ, **then** the agent sees the employee's real name, email, and organization name instead of an anonymous visitor.
- **Given** the SalesIQ script loads before `getMe()` resolves, **when** `getMe()` later resolves, **then** the visitor is still correctly identified (no race condition where identification is silently skipped).

### Error / Toast Messages

Not applicable — this is a background API call with no user-facing failure state; if identification fails, the widget still works, just anonymously (same degraded-but-functional posture as the script-load failure above).

---

## Story: "Chat with Us" on the Help Page

**As a** logged-in employee
**I want** the Help page to actually do something
**So that** navigating to Help isn't a dead end

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Help | Page title "Help" | heading | — |
| Help | "Chat with Us" button | button → opens/focuses the SalesIQ chat panel | — |

### Flow

1. Replaces `frontend/src/app/(private)/help/page.tsx`'s `<ComingSoon title="Help" />` with a simple page containing a "Chat with Us" call-to-action.
2. Clicking "Chat with Us" opens the SalesIQ chat panel programmatically (the same widget already floating globally per the first story above — this button is a second, explicit entry point into it, not a separate chat instance).
3. If the widget failed to load (see the first story's Flow point 4), the button is hidden rather than shown in a broken/no-op state — Help still renders, just without the button, matching the "degrade gracefully, no error" posture used everywhere else in this integration.

### Validation Rules

Not applicable.

### Acceptance Criteria

- **Given** the widget loaded successfully, **when** the employee clicks "Chat with Us" on the Help page, **then** the SalesIQ chat panel opens.
- **Given** the widget failed to load, **when** the Help page renders, **then** the "Chat with Us" button is not shown.

### Error / Toast Messages

Not applicable.

---

## API Design

No new backend REST endpoints, tables, or migrations. The only server-adjacent change is a new frontend environment variable:

| Variable | Where | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_ZOHO_SALESIQ_WIDGET_URL` | `frontend/.env` / `.env.example` | The full loader-script URL Zoho SalesIQ issues per account — the `src` attribute of Zoho's own embed snippet, e.g. `https://salesiq.zohopublic.in/widget?wc=<widget-code>`. Holds the whole URL, not just a bare code: the domain is region-specific (`.in`/`.com`/`.eu`/`.com.au`/...) and the widget code is a query param on it, not a separate JS property — confirmed against a real account's actual snippet, not assumed. `NEXT_PUBLIC_` prefix since it's read client-side, matching this codebase's existing convention (`NEXT_PUBLIC_API_BASE_URL`). No fallback — if unset, the widget simply never loads (see the first story's Flow point 4), the same fail-safe-but-silent posture, not a startup throw like `JWT_SECRET`'s. |

## Data Model

No changes. No new tables, no new columns on `Employee`/`Organization`.

## Validation Rules Summary

Not applicable — this epic has no user-submitted form data anywhere in its three stories.

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| ZS-01 | Load any private page with the widget code configured | Floating chat launcher appears |
| ZS-02 | Load any public page (`/login`, `/register`, etc.) | No widget appears |
| ZS-03 | Navigate between two private pages | Widget persists without reloading |
| ZS-04 | Unset `NEXT_PUBLIC_ZOHO_SALESIQ_WIDGET_URL`, load a private page | App renders normally, no widget, no error |
| ZS-05 | Start a chat as a logged-in employee, inspect the conversation from the Zoho SalesIQ agent console | Visitor shows the employee's real name/email/organization, not "Anonymous" |
| ZS-06 | Click "Chat with Us" on the Help page | SalesIQ chat panel opens |
| ZS-07 | Widget fails to load, then visit the Help page | Page renders, "Chat with Us" button is absent |

## Out of Scope

- Per-organization widget codes / a Company Settings screen for admins to configure their own SalesIQ account — this story ships one org-wide key via env var (see the scoping decision in [Overview](#overview)).
- Loading the widget on `(public)/` pages (pre-login support chat for prospective/unauthenticated visitors) — could be a separate, later story if there's a need for it.
- Passing phone number, GST number, role, or any other session field beyond name/email/organization to SalesIQ.
- Any inbound integration from Zoho back into this app — chat transcripts, ticket data, or analytics are not synced into or surfaced from this codebase anywhere.
- A native-mobile equivalent (this app has no mobile client to speak of yet).
- Role-based or feature-flagged hiding of the widget for specific employees/organizations — every authenticated session gets the same widget.
- Proactive chat triggers (Zoho SalesIQ's own "engagement rules" that pop a chat prompt after N seconds on a page) — this story only covers the passive floating launcher and the Help page's explicit button.

## Open Questions / Assumptions

- **Three scoping questions were asked before writing this doc and did not get an answer in time** — this doc proceeded with the recommended default at each, and all three need explicit confirmation before implementation starts:
  1. Widget scope: assumed **app-wide across `(private)/` only**, not public pages, not Help-page-only.
  2. Visitor identity: assumed **yes**, pass name/email/organization.
  3. Configuration: assumed **one org-wide env var**, not a per-organization admin-configurable setting.
- **Resolved**: a live Zoho SalesIQ account and widget URL exist and were provided during implementation (`salesiq.zohopublic.in` region) — set locally in `frontend/.env.local` (gitignored, never committed) for testing; this is the org-wide value referenced throughout this doc.
- **Exact Zoho SalesIQ JS API method names** (visitor identification call, programmatic "open chat" call) are deliberately not specified here — Zoho's SDK surface is versioned and has shifted across product generations; implementation should reference Zoho's own current SalesIQ JS API docs at build time rather than this doc guessing at method signatures that could be stale by then.
- **Whether the widget should be visually repositioned** (Zoho defaults to bottom-right, which may overlap other floating UI this app adds later) is left as an implementation-time detail, not specified here since no conflicting UI exists yet.
