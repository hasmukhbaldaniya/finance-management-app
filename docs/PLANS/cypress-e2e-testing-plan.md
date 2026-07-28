# Cypress End-to-End Testing Plan

Status: **Phase 1 (Authentication + Organization Signup) is built and green — 11/11 tests passing
against the real stack.** `frontend/cypress/` now holds the suite (`cypress.config.ts`,
`cypress/support/commands.ts`'s `cy.loginAs`/`cy.apiRegisterOrganization`/`cy.getLatestNotification`,
specs under `cypress/e2e/001-authentication/` and `cypress/e2e/002-organization-signup/`) — see
"Implementation notes from Phase 1" near the end of this doc for the real environment gotchas hit
along the way. Every later phase (see "Phasing" below) proceeds the same way: its own PR, updating
`frontend/CLAUDE.md` per the global rule that whoever introduces a new top-level convention
documents it in the same PR (Phase 1 already did this for the `cypress/` convention itself).

## Why Cypress, and why it lives in `frontend/`

This repo is seven independently-run services with no shared tooling (root `CLAUDE.md`). Only one
of them is browser-facing: `frontend/` (Next.js, port `3000`). Every other service — `auth-service`,
`claim-service`, `gateway-service`, `reports-service`, `communications-service`, `ai-service` — is an
API the browser never talks to directly (only `gateway-service` is CORS-configured for the browser
at all). That makes end-to-end testing a **frontend concern**: Cypress drives the real browser
against `http://localhost:3000`, and every network call the app makes under the hood goes to
`gateway-service` at `http://localhost:4400/api`, which fans out to whichever backend actually
owns that path. E2E tests never call `auth-service`/`claim-service`/etc. directly — they go through
the exact same single origin the real app uses, so the tests exercise the real routing table
(`gateway-service/CLAUDE.md`), not a shortcut around it.

Cypress fits better here than a component/unit runner because nearly every "module" in this app
(Employee Invitation, Category wizard, Trip creation, Claim creation) is a multi-step flow spanning
several routes and several sequential API calls — the value is in proving the whole flow works
against real running services, not in isolating one function. `frontend/CLAUDE.md`'s own module
write-ups (Category Management's 4-step wizard, Employee Invitation's single-page "5 API calls in
sequence" submit, Onboarding's 4-step context-threaded flow) are exactly the shape Cypress is built
to drive.

This introduces `frontend/cypress/` and a `cypress` devDependency in `frontend/package.json` —
the first test runner this project has had. That's a real new top-level convention, so
`frontend/CLAUDE.md` gets a new section describing it (folder layout, commands, selector
convention) in the same PR that adds the config, not as a follow-up.

## Environment topology tests run against

Cypress needs the full stack up, not just `frontend/`:

| Service | Port | Role in a test run |
|---|---|---|
| `frontend` | 3000 | what Cypress visits (`baseUrl`) |
| `gateway-service` | 4400 | every `cy.request`/intercepted call target — the only origin the app itself calls |
| `auth-service` | 4300 | identity, org, employee, grade/department/role data — reached only via the gateway |
| `claim-service` | 4000 | category/trip/claim data — reached only via the gateway |
| `reports-service` | 4500 | the four Dashboard report tabs — reached only via the gateway |
| `communications-service` | 4200 | invite/OTP emails — see "Email/OTP flows" below for how tests handle these without a real inbox |
| `ai-service` | 4100 | only exercised if AI-Powered claim creation (`023`) is in scope — see Phasing |
| Postgres x3, MySQL, MongoDB | — | `docker compose up -d` from repo root (root `CLAUDE.md`) |

Locally, a developer runs `docker compose up -d` once, then starts all six Node services plus
`ai-service` in separate terminals (or via a single `dev:all`-style script added alongside the
Cypress setup — see Open Questions). In CI, the workflow does the same in sequence before
`cypress run` (see "CI integration" below).

## Authentication strategy: seed once, log in programmatically, cache the session

The repo already has a seeded login: `auth-service/src/seeders/20260702030000-demo-user.js` creates
`demo@example.com` / `Passw0rd!`, an **owner**, **Company Admin** employee on the seeded
"Smartsense" organization. That's the natural default fixture identity for E2E, since it already
passes every `isOwner`-gated screen (Associated Organizations) and every privilege-gated one
(Roles & Privileges' `Company Admin` has every privilege by default).

Logging in through the UI (`(public)/login/page.tsx`) for every single test would make the whole
suite slow and would make every module's test implicitly depend on the Authentication module never
breaking. Standard Cypress practice — and what this plan proposes — is:

- One real UI-driven login test exists (in the Authentication module itself) that exercises the
  actual form, validation, and redirect.
- Every other module's tests authenticate via `cy.session()` wrapping a direct `cy.request('POST',
  '<gateway>/api/auth/login', {...})` call, which sets the same `httpOnly` session cookie
  (`AUTH_COOKIE_NAME`) the real login flow sets — `src/proxy.ts` only checks that the cookie carries
  a validly-signed JWT, it has no way to tell a programmatic login from a real one. `cy.session()`
  caches the resulting cookie jar across tests in the same run, so the login call happens once per
  spec file (or once per run, depending on `cacheAcrossSpecs`), not once per test.
- A custom command, `cy.loginAs(email, password)`, wraps this and is the one thing every other
  module's tests call in a `beforeEach`.

This means Cypress needs a second, dedicated login identity beyond the demo owner for any test that
needs a **non**-owner or a restricted-privilege user (e.g. confirming Associated Organizations'
nav link is hidden for a non-owner, or that a `Members`-role employee can't reach Roles &
Privileges) — see "Test data strategy" below for where that comes from.

## Test data strategy: every spec file bootstraps its own organization via API

The demo org is real seed data other developers and manual QA also poke at locally — CRUD-heavy
modules (Grade/Department/Role/Employee/Category/Trip/Claim management) create, edit, suspend, and
delete rows as part of normal test flow, and running that against shared data would make test runs
non-repeatable and would risk a developer's own manual-testing state getting deleted by a
`describe.only` gone wrong. So no module's tests run against the shared demo org except the plain
login happy-path (a read-only auth check, not a mutation).

Rather than one Cypress-wide organization created once and shared (via a fixture file) across every
later phase, **each spec file provisions its own throwaway organization in a `before` hook**, via
direct API calls that replicate the real registration flow (`002-organization-signup.md`,
`POST /api/auth/registrations/*` through `auth-service`, called through the gateway exactly like the
UI does) — not a hand-written seeder, so the fixture data still goes through the exact same code
path a real customer does. A shared custom command, `cy.apiRegisterOrganization()`, does this in a
few `cy.request` calls (org/GST → details → verify email OTP → skip mobile → complete) and returns
`{organizationId, ownerEmail, ownerPassword, accessTokenCookie}`; every module's spec calls it once
in a `before` hook with a unique GST/email (timestamped) and gets back a brand-new, empty
organization nobody else's data can collide with.

This is a deliberate change from an earlier draft of this plan, which had every phase share one
fixture organization written to disk by the Organization Signup spec. That made spec **files**
depend on each other's run order (Cypress's default alphabetical file order does not match the
phase table below), which is exactly the kind of cross-file coupling Cypress's own guidance warns
against. Self-contained specs cost a handful of extra API calls in each `before` hook (sub-second
each) in exchange for every spec file being runnable alone, in any order, or repeatedly, with no
shared fixture to go stale. The one real UI-driven exception is the Organization Signup module
itself (Phase 1) — its own spec drives the actual multi-step wizard through the browser, since
that's the thing being tested; every other module's setup calls the same endpoints directly.

A `Members`-role second login (for permission-boundary tests — e.g. confirming Associated
Organizations' nav link is hidden for a non-owner) is created the same way, via a second shared
command (`cy.apiInviteAndOnboardEmployee()`, chaining Employee Invitation's endpoints and the
Onboarding flow's endpoints), called only by the specs that actually need a non-owner login.

**Email/OTP flows** (registration email-OTP, password-reset OTP, employee-invite email, mobile OTP)
have no real inbox in this loop — `communications-service` only logs to its own `NotificationLog`
(Mongo) and, for WhatsApp, to a `console.log` stub (root `CLAUDE.md`); nothing is actually delivered
anywhere today, real or fake. Critically, **the OTP itself cannot be recovered from `auth-service`**
— `Otp.otpHash` is a one-way bcrypt hash (`auth-service/src/utils/otp.ts`), not reversible, and
adding a way to reverse it would be a real security regression even gated behind an internal-only
route. The actual plaintext OTP only ever exists in the email/WhatsApp body text that
`communications-service` sends and logs: `sendOtpEmail` (`auth-service/src/utils/mailer.ts`) builds
`` `Your OTP is ${otp}...` `` and hands it to `communications-service`'s
`POST /api/notifications/email`, which persists that exact body into `NotificationLog.body`
(`communications-service/src/models/notification-log.model.ts`) regardless of purpose. See
"Decisions" below for the endpoint this plan adds to read that back.

## Selector strategy

`grep -r data-testid frontend/src` currently returns nothing — there is no test-attribute
convention anywhere in this codebase yet. Retrofitting `data-*` attributes onto every existing
component up front is out of scope for "start the E2E suite"; instead:

- Cypress queries prefer **accessible, user-facing selectors first** — `cy.findByRole`,
  `cy.findByLabelText`, `cy.contains` (via `@testing-library/cypress`, added alongside `cypress`
  itself) — which also back-fills a cheap regression check on the global accessibility rules
  (`~/.claude/CLAUDE.md`'s Accessibility Minimums: every interactive element needs the ARIA
  attributes its role requires), since a role/label query simply can't find an element that lacks
  them.
- A `data-cy="<kebab-name>"` attribute is added **only** where a role/label query is genuinely
  ambiguous or brittle (e.g. picking one row out of a dynamic table, or a repeated icon-only button
  with no distinguishing label) — added to the component in the same PR that adds the test needing
  it, not swept across the codebase in advance. `frontend/CLAUDE.md` gets one line documenting this
  convention once the first `data-cy` attribute lands.

## Folder structure and naming

```
frontend/
├── cypress/
│   ├── e2e/
│   │   ├── 001-authentication/
│   │   │   ├── login.cy.ts
│   │   │   └── forgot-password.cy.ts
│   │   ├── 002-organization-signup/
│   │   │   └── registration.cy.ts
│   │   ├── 004-grade-management/
│   │   ├── 005-department-management/
│   │   ├── 006-roles-and-privileges/
│   │   ├── 007-associated-organizations/
│   │   ├── 008-011-employee-management/
│   │   ├── 012-employee-profile/
│   │   ├── 013-016-category-management/
│   │   ├── 018-021-trip-management/
│   │   ├── 022-025-claim-management/
│   │   └── 028-reports/
│   ├── fixtures/                   # static input data only (e.g. sample CSV/XLSX for Bulk Invite) —
│   │                               # no per-run generated org data; that comes from cy.apiRegisterOrganization()
│   ├── support/
│   │   ├── commands.ts             # cy.loginAs, cy.apiRegisterOrganization, cy.apiInviteAndOnboardEmployee, cy.getLatestNotification
│   │   ├── e2e.ts
│   │   └── selectors.ts            # data-cy constants, one export per module
│   └── cypress.config.ts
```

Spec folders are named `<story-number>-<slug>/` to match `user-stories/*.md` one-to-one — the same
"nearest real example before inventing a pattern" instinct the rest of this repo already follows
(root `CLAUDE.md`). `describe` blocks inside each spec reference the story number in their title
(e.g. `describe('009 - Employee Listing', ...)`) so a failing test maps back to its spec doc
immediately.

## Module breakdown and phasing

Ordered by implementation priority, not runtime data dependency — since every spec now bootstraps
its own organization via `cy.apiRegisterOrganization()` (see "Test data strategy" above), no
module's tests actually require another phase's *tests* to have run first. The one real dependency
is that `cy.apiRegisterOrganization()`/`cy.apiInviteAndOnboardEmployee()` themselves must exist
before any later phase's spec can use them — both are written once, in Phase 1/Phase 2, and reused
verbatim afterward:

| Phase | Modules (user stories) | First needs |
|---|---|---|
| 1 | Authentication (`001`), Organization Signup (`002`) | nothing — introduces `cy.apiRegisterOrganization()` |
| 2 | Header Navigation (`003`), Employee Management: Invitation/Listing/Bulk/Onboarding (`008`-`011`), Employee Profile (`012`) | `cy.apiRegisterOrganization()`; introduces `cy.apiInviteAndOnboardEmployee()` |
| 3 | Grade (`004`), Department (`005`), Roles & Privileges (`006`), Associated Organizations (`007`) | `cy.apiRegisterOrganization()` |
| 4 | Category Management: create/list/edit/duplicate/version history (`013`-`016`) | `cy.apiRegisterOrganization()` |
| 5 | Trip Management: create/list/details/edit (`018`-`021`) | `cy.apiRegisterOrganization()`; a Category fixture (a trip-linked claim needs one — create inline via the Category APIs, not a whole Phase-4 dependency) |
| 6 | Claim Management: manual creation, AI-powered creation, listing, Split Claim/Split Expense (`022`-`025`) | Category + Trip fixtures, created inline the same way |
| 7 | Reports/Dashboard (`028`) | Claim/Trip/Expense fixtures, created inline |
| 8 | Zoho SalesIQ (`017`) — thin, presence-only check (widget mounts, degrades silently if env var unset) | `cy.apiRegisterOrganization()` |

`029-claim-trip-approvals.md` (Approvals) is explicitly **out of scope** — root `CLAUDE.md` notes
it's a separate, currently on-hold epic. `026` (MUI migration) and `027` (Split redesign) are
already-completed refactors of stories already covered above, not modules of their own.

Phase 1 is built (see Status above). Phase 2 is the recommended next step — it's the other
consumer of `cy.apiRegisterOrganization()` and introduces the second shared command every
non-owner-permission test after it will need.

## What each module's spec actually covers

Per `user-stories/TEMPLATE.md`'s existing shape (Flow, Edge Cases, Acceptance Criteria), each
module's Cypress spec is expected to cover, at minimum:

- The primary happy-path flow end-to-end (every step of a wizard, not just the first screen).
- The permission/visibility boundary the story specifies, if any (owner-only nav links, role-gated
  actions, self-exclusion rules like Employee Listing's "never show the caller's own row").
- The one or two Edge Cases each story doc already calls out explicitly (e.g. Employee Listing's
  asymmetric Suspend/Activate confirmation, Grade/Department/Role's always-confirm status toggle,
  the last-Company-Admin suspend guard) — these are already-known behaviors worth locking in, not
  new test design.
- Empty/zero states (e.g. the empty-Employees-table-inside-`TableBody` fix noted in
  `frontend/CLAUDE.md`) and basic validation error rendering.

Explicitly **not** covered by this plan: visual regression testing, load/performance testing,
cross-browser matrix beyond Chrome (headless) locally and in CI, and true WhatsApp delivery
(there is no real provider wired up yet, per root `CLAUDE.md` — nothing to test).

## CI integration

A GitHub Actions job (new workflow, or a job appended to an existing one — repo currently has no
`.github/workflows/` checked, confirm during Phase 1 setup) that:

1. Starts `docker compose up -d` for the four databases.
2. Runs each service's `migrate`/`seed` (or equivalent) and starts all six Node services plus
   `ai-service` in the background, waiting on each one's health-check route (root `CLAUDE.md`: "one
   model, one health-check route" was the original skeleton — confirm each service still exposes
   one) before proceeding.
3. Runs `cypress run` headless against `frontend`, uploading screenshots/videos on failure as build
   artifacts.

This job only needs to exist once Phase 1 has real specs to run — no point wiring CI against an
empty `cypress/e2e/` folder.

## Decisions (confirmed)

1. **OTP/invite-token retrieval for tests** — a new read-only endpoint on `communications-service`,
   `GET /api/notifications/latest?to=<identifier>&channel=email|whatsapp`, gated by that service's
   existing `requireInternalAuth` (`INTERNAL_API_KEY`/`X-Internal-Api-Key`, the same opt-in shared
   secret its `/api/notifications/{email,whatsapp}` send routes already use). It returns the most
   recent `NotificationLog` document's `subject`/`body` for that recipient — Cypress regexes the
   6-digit OTP or the onboarding/invite link straight out of the plaintext body. This is a
   test-support exception to "tests only ever call the gateway" above: setup/teardown code calls
   `communications-service` directly at `http://localhost:4200`, since fetching a delivered
   message is test infrastructure, not something the real app's UI ever does — the actual
   assertions under test still only ever go through the gateway/browser. **Not** an `auth-service`
   endpoint — see "Test data strategy" above for why that would require reversing a bcrypt hash.
2. **Local multi-service startup** — manual (developer starts each service themselves) for now. Not
   worth a `dev:all` script until the suite itself is running; revisit if it becomes friction.
3. **Reporting** — local-only (Cypress's own screenshots/videos on failure). No Cypress Cloud for
   now.
4. **`ai-service` in CI** — the AI-Powered claim creation spec (Phase 6) is tagged and excluded from
   the CI run (real `ANTHROPIC_API_KEY` cost); it runs locally/manually only until there's a reason
   to mock the `claim-service`→`ai-service` boundary instead.

## Implementation notes from Phase 1

Three real things surfaced only by actually running the suite against the live stack, worth knowing
before writing Phase 2+:

- **Local SMTP was never configured** — `communications-service/.env`'s `SMTP_USER`/`SMTP_PASSWORD`
  were still the literal placeholder values from `.env.example` (`your-email@gmail.com`/
  `your-16-char-app-password`). This isn't a Cypress-specific problem: **any** flow that sends a real
  OTP/invite email (registration, forgot-password, employee invite) 500s locally, with or without
  tests, since a real send failure is re-thrown as a 502 by `communications-service` and not
  swallowed by `auth-service` either (both by deliberate, documented design — see
  `communications-service/CLAUDE.md`). Fixed by generating a free Ethereal Email test account
  (`nodemailer.createTestAccount()` — no signup, no real delivery, just a real SMTP endpoint that
  accepts the send) and wiring its `user`/`pass`/`smtp.host` into `communications-service/.env`.
  Anyone resetting their local env needs to do the same (or supply real SMTP creds) before Phase 2+
  specs touching Employee Invitation/Onboarding will work either.
- **`login/layout.tsx` and `forgot-password/layout.tsx` both redirect an already-authenticated
  visitor straight to `/dashboard`** (a `getMe()` check on mount) — since
  `cy.apiRegisterOrganization()` leaves the browser holding a real session cookie (registration logs
  the new owner in immediately, same as the real wizard), any spec that registers an org and then
  needs to visit `/login` or `/forgot-password` must `cy.clearCookies()` first, or it never reaches
  the form at all. `forgot-password.cy.ts` does this in its `beforeEach`.
- **Assertions immediately after an action that triggers a real email send need a longer-than-default
  timeout** — Cypress's default command timeout (4s) is sometimes shorter than a real SMTP round
  trip. Registration's step-2 submit and Forgot Password's step-1 submit both send an OTP email
  synchronously before responding; the `cy.location(...).should(...)` right after each uses an
  explicit `{ timeout: 15000 }`.

## Next step

Phase 1 is done (see Status above). Phase 2 (Header Navigation + Employee Management + Employee
Profile) is next: extend `cypress/support/commands.ts` with `cy.apiInviteAndOnboardEmployee()` (the
Employee Invitation + Onboarding endpoints, chained the same way `cy.apiRegisterOrganization()`
chains registration's), then write specs under `cypress/e2e/003-header-navigation/` and
`cypress/e2e/008-011-employee-management/` per the folder convention above.
