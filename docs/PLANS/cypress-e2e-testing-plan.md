# Cypress End-to-End Testing Plan

Status: **Phases 1-4 are built and green — 62/62 tests passing across all 17 spec files against the
real stack** (Authentication, Organization Signup, Header Navigation, Employee Invitation, Employee
Listing, Bulk Invite, Employee Onboarding, Employee Profile, Grade Management, Department
Management, Roles & Privileges, Associated Organizations, Category Creation, Category Listing,
Category Edit/Duplicate, Category Version History). `frontend/cypress/` holds the suite
(`cypress.config.ts`, `cypress/support/commands.ts`'s `cy.loginAs`/`cy.apiRegisterOrganization`/
`cy.apiInviteAndOnboardEmployee`/`cy.apiCreateCategory`/`cy.getLatestNotification`/`cy.selectMuiOption`,
specs under `cypress/e2e/001-authentication/`, `cypress/e2e/002-organization-signup/`,
`cypress/e2e/003-header-navigation/`, `cypress/e2e/004-grade-management/`,
`cypress/e2e/005-department-management/`, `cypress/e2e/006-roles-and-privileges/`,
`cypress/e2e/007-associated-organizations/`, `cypress/e2e/008-011-employee-management/`,
`cypress/e2e/012-employee-profile/`, `cypress/e2e/013-category-creation/`,
`cypress/e2e/014-category-listing/`, `cypress/e2e/015-category-edit-and-duplicate/`, and
`cypress/e2e/016-category-version-history/`) — see "Implementation notes" for Phases 1-4 near the
end of this doc for the real environment gotchas and a11y gaps hit along the way. Every later phase
(see "Phasing" below) proceeds the same way: its own PR, updating `frontend/CLAUDE.md` per the
global rule that whoever introduces a new top-level convention documents it in the same PR (Phase 1
already did this for the `cypress/` convention itself).

A full `cypress run` across all 17 spec files takes ~4 minutes once services are warm — real SMTP
round-trips (~2-4s each) dominate individual OTP-dependent tests. **At this spec count, a full run
can occasionally hit transient Ethereal SMTP flakiness under sustained concurrent send load** — see
"Implementation notes from Phase 4" for what that looks like and how to tell it apart from a real
failure before assuming a regression.

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
| 4 | Category Management: create/list/edit/duplicate/version history (`013`-`016`) | `cy.apiRegisterOrganization()`; introduces `cy.apiCreateCategory()` |
| 5 | Trip Management: create/list/details/edit (`018`-`021`) | `cy.apiRegisterOrganization()`; `cy.apiCreateCategory()` (a trip-linked claim needs one) |
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

## Implementation notes from Phase 2

Phase 2 added `cy.apiInviteAndOnboardEmployee()` (008's invite chain + 011's onboarding chain,
with an `onboard: false` escape hatch for tests that need a still-pending invite) and
`cy.selectMuiOption()`, then covered Header Navigation (003), Employee Invitation/Listing/Bulk
Invite/Onboarding (008-011), and Employee Profile (012). Several real, pre-existing accessibility
gaps and MUI quirks surfaced — all worth knowing before Phase 3 (Grade/Department/Roles &
Privileges/Associated Organizations), since every one of those screens reuses the same primitives:

- **`select-field.tsx`'s MUI `Select` has no accessible name at all** — a real gap against the
  global "every interactive element needs the ARIA attributes its role requires" rule. Its visible
  `role="combobox"` element is a `<div>`, which per the HTML spec can't be the target of a
  `<label for>` (every call site pairs one anyway, matching every other field in this app), and
  `select-field.tsx` never passes MUI's `labelId`/`label`/`aria-label` prop either — the `id` a
  caller passes lands on a hidden native `<input>` instead. Net effect: `findByLabelText`/
  `findByRole(..., {name})` cannot find it by name at all. `cy.selectMuiOption(labelText, optionText)`
  works around this via DOM proximity (`cy.contains("label", labelText).parent().find('[role="combobox"]')`)
  — reuse it for every future `SelectField`, don't re-derive this. Flagged, not fixed — fixing
  `select-field.tsx` itself is a real app change with its own design call, out of scope for adding
  tests.
- **Filter-row `Input`s on list screens (e.g. Employee Listing) have no label at all**, not even a
  broken one — just a shared, non-unique `placeholder="Search"` across every column. Targeted by
  the filter row's known column order instead (`cy.get("thead tr").eq(1).find("th").eq(N)`) — see
  employee-listing.cy.ts's own header comment for the exact column mapping on that screen; re-derive
  the mapping per screen from its own `SORTABLE_COLUMNS`-equivalent rather than assuming it matches.
- **MUI's `MenuItem` always sets `role="menuitem"`**, overriding whatever the underlying tag's own
  implicit role would be — `header.tsx`'s "View Profile" item renders as a real `<a href="/profile">`
  (`component={Link}`) but `findByRole("link", ...)` never matches it; use `findByRole("menuitem", ...)`
  instead, and the href assertion still works since the tag itself is a real anchor.
- **MUI's `Switch` puts a passed `aria-label` on the `SwitchBase` root `<span>`, not the inner
  `role="switch"` `<input>`** — so that label doesn't count as the input's accessible name either
  (ancestor `aria-label` isn't inherited by a descendant's name computation). Employee Listing's
  Suspend/Activate toggle is targeted via `[aria-label="Suspend"]`/`[aria-label="Activate"]`
  attribute selectors directly, not `findByRole("switch", {name})`.
- **Chaining two testing-library `find*` queries inside one `cy.within()` block intermittently threw
  "Expected container to be an Element...but got undefined"** once the scoped row had already
  re-rendered between the two queries (observed after Employee Invitation's redirect-then-filter
  flow). Fixed by aliasing the row (`cy.contains(...).as("row")`) and using plain jQuery-style
  `cy.get("@row").find(...)` for subsequent assertions instead of nesting `findBy*` calls inside
  `.within()`.
- **The Zoho SalesIQ chat bubble (fixed, bottom-right) can visually overlap a real, functional button**
  (e.g. Employee Edit's "Save Changes") without that being any kind of bug — assert `.should("exist")`
  rather than `.should("be.visible")` in these cases, or the test fails on an unrelated third-party
  widget's z-index.
- **A brand-new organization has zero Departments/Grades** (only the two seeded Roles) — any test
  touching Employee Invitation, Bulk Invite, or `cy.apiInviteAndOnboardEmployee` needs to create at
  least one of each first via direct `POST /departments`/`POST /grades` calls (exactly what
  `cy.apiInviteAndOnboardEmployee` now does internally).
- **Bulk Invite's CSV upload needs no binary XLSX fixture** — `csv-parse/sync` accepts a plain CSV
  string built inline (`Cypress.Buffer.from(csvString)` via `selectFile`), matching
  `BULK_COLUMNS` in `auth-service/src/utils/constants/bulk-invite.constant.ts` exactly (header text,
  order, and which columns are required) — "Company" must equal the org's real name, "Role"/
  "Department"/"Grade" must already exist by exact name.
- **Test isolation clears cookies before every single test, even ones inside the same `describe`
  block whose data was seeded once in a `before` hook** — any spec using `before()` for
  `cy.apiRegisterOrganization()`/`cy.apiInviteAndOnboardEmployee()` still needs `cy.loginAs(...)` in
  a `beforeEach` to re-establish the session before each test (cheap: `cy.session` caches it, so
  this doesn't re-hit the login endpoint every time).
- **A locally-run full suite (`cypress run` with no `--spec` filter) is dominated by real SMTP
  latency**, not test logic — 94 real email sends across the 9 Phase 1+2 spec files, at ~2-4s each,
  account for most of the ~2 minute total run time. A slow individual `cypress run` invocation is not
  by itself evidence of a hang; check the target service's own request log (e.g.
  `communications-service`'s access log) for continuous, healthy activity before concluding
  otherwise.

## Implementation notes from Phase 3

Phase 3 needed no new custom commands (confirming Phase 2's prediction) — `cy.apiInviteAndOnboardEmployee`
gained optional `departmentId`/`gradeId` overrides so Grade/Department's Members-dialog tests could
assign a real employee to a *specific*, already-known row instead of a throwaway one. Grade
Management is the reference implementation for Department (a confirmed byte-for-byte copy, noun
swapped) and closely related to Roles & Privileges; Associated Organizations turned out to be the
odd one out. What surfaced:

- **A grade/department/role's Members-count cell has no `aria-label` at all** — but unlike
  `SelectField`/`Switch`, this is actually fine: it's a bare `<button>{count}</button>`, so the
  visible number itself becomes the accessible name and `findByRole("button", {name: "1"})` works
  unmodified. Worth checking what's actually rendered before assuming every unlabeled control needs
  a workaround — some don't.
- **`cy.contains("tr", text)` risks matching the header row** if used as the very *first* assertion
  right after a page visit, since a `<thead>` row is a real `<tr>` too and the retry loop can
  transiently resolve to it before the data finishes its first load. Scope the initial lookup to
  `td` (data cells only — headers render as `th`) instead: `cy.contains("td", text).closest("tr")`.
  Once the table has already rendered once (e.g. right after creating a row mid-test),
  `cy.contains("tr", text)` directly is fine — this only bit the very first assertion in a fresh spec.
- **Closing one dialog and immediately opening another can intermittently fail** with `"...not
  visible because it has CSS property position: fixed and it's being covered by..."`, naming the
  *new* dialog's own `MuiDialog-container` as the culprit — not a leftover old dialog, and not
  something a longer timeout fixes on its own. Two related but distinct fixes were needed: (1) after
  clicking a dialog's own "Cancel", assert `cy.findByRole("dialog").should("not.exist")` before
  opening the next one; (2) after opening a *new* dialog, assert something inside it (e.g. its own
  heading) is visible before asserting on content further down — Roles & Privileges' dialog is tall
  enough (8 privilege checkboxes) that its lower content additionally needed `.scrollIntoView()`,
  the same fix Phase 2 already used for the Zoho-widget-overlap issue, here caused by the dialog's
  own scrollable content instead.
- **MUI's `Checkbox` (unlike its `Switch`) correctly forwards a passed `id` to the actual
  `<input type="checkbox">`** — confirmed via MUI's own `SwitchBase.js` source (`hasLabelFor = type
  === 'checkbox' || type === 'radio'` gates whether `id` lands on the real input rather than being
  dropped) — so `privilege-checkbox-list.tsx`'s real `<label htmlFor>`/`<input id>` pairing works
  with plain `findByLabelText`, no `selectMuiOption`-style workaround needed. Don't assume every MUI
  form control has the same accessible-name gap `Select`/`Switch` do; check the specific component.
- **Associated Organizations (007) is genuinely unseedable, and its empty state hides more than
  expected**: `auth-service` has no create/invite endpoint for `AssociatedOrganization` at all (only
  `GET /`/`PATCH /:id/status`), so a Cypress-registered org's list is permanently empty — matching
  the story's own Out of Scope note. Worse, `page.tsx`'s `rows.length === 0 ? <EmptyText/> :
  <Table>...</Table>` swaps out the *entire* table, not just the body rows, which
  `frontend/CLAUDE.md` already separately flags as a known, deliberately-unfixed bug shared with
  Employee Listing's own (fixed) version of the same mistake — so the sortable headers and the
  per-column filter row **never render at all** for a fresh org. Rather than fabricate seed data via
  a raw DB write (the anti-pattern this whole plan avoids elsewhere) or silently skip coverage, the
  spec says so directly in its own header comment and tests only what's actually reachable: the
  empty state itself, and the filter-toggle button's own state (which sits outside that
  conditional). If 007 ever gains a create/invite flow, or the empty-table bug gets fixed, this spec
  should be revisited to add the sort/filter coverage that's currently impossible.

## Implementation notes from Phase 4

Category Management is the largest single feature in the frontend, but building
`cy.apiCreateCategory()` against claim-service's real REST contract (create → fields → policies →
project-policies) made most of it tractable without a full UI walkthrough of the more complex wizard
steps. What surfaced:

- **The minimal valid payload for each step had to come from reading claim-service's actual
  validation code, not the frontend** — e.g. `PUT /:id/policies` requires >=1 Claim Policy
  **even when `isDraftSave: true`** (only duplicate-name/rule checks are skipped by that flag, not
  "at least one policy exists" itself), and a Default Approval Flow with `autoApprove: true` needs
  zero approvers (`stages: []`) — the per-stage minimum-approver check is skipped entirely for
  auto-approve flows. Guessing a "reasonable-looking" payload instead of reading the validator would
  very likely have produced a fixture that only worked by accident, or not at all.
- **Steps 3-4's UI (eligibility/rules/approval-flow editors) is complex enough that a UI-driven
  creation test was deliberately not attempted** — `cy.apiCreateCategory()` bypasses it entirely,
  the same "bypass the wizard, not the backend contract" posture `cy.apiInviteAndOnboardEmployee`
  already uses for Employee Onboarding. Only Step 1 (Basic Details) is driven for real through the
  browser (013's spec) — it's this app's actual entry point and simple enough to justify the UI
  coverage.
- **A "Save & Continue" on a *new* category during the Duplicate flow (015) does NOT yet persist the
  duplicated fields/policies server-side** — Step 1's own save only ever calls `createCategory`; the
  copied fields/policies exist solely in client-side `CategoryWizardContext` until each later step is
  itself saved. A test asserting duplication "worked" right after Step 1 has to check the Step 2 UI
  (which renders from context, guarded by `startSkippingLoadsFor` against being clobbered by its own
  fetch of the still-empty new category) rather than querying the API for fields that don't exist
  there yet.
- **Two more curly-quotes/multiple-match gaps, same family as Phase 2/3's**: `DeleteCategoryDialog`
  renders its confirmation text with real `&ldquo;`/`&rdquo;` curly quotes, not straight ones —
  `findByText` needs the actual Unicode characters (`“`/`”`) to match. Several field/status labels
  (e.g. "Amount", "Draft") appear in more than one place on the same page (a field-type-library
  option *and* an already-added field's name; a card's status Chip *and* the version-history
  dialog's own text) — use `findAllByText` with a length assertion, or scope via
  `findByRole("dialog").should("contain.text", ...)`, rather than a bare `findByText` expecting
  exactly one match.
- **A `Button` rendered via `component={Link}` has role `"link"`, not `"button"`**, regardless of
  it visually looking like a button — `findByRole("button", {name: "Create Category"})` fails
  silently (times out looking for a role that was never there); use `findByRole("link", ...)`
  instead. The empty-state page renders *two* such Create Category links simultaneously (top-right +
  centered empty-state), so that assertion also needs `findAllByRole`.
- **`isEnabled` defaults to `true` even for a still-draft category** (claim-service's own model
  default) — a draft's Switch renders visually unchecked *and* disabled, but its `aria-label` still
  reads "Disable {name}", never "Enable {name}". Don't assume a visually-off toggle implies an
  "Enable" label; check the actual default value server-side.
- **A full local run across 17 spec files can transiently 500 on `POST /auth/registrations`** with
  the exact same generic "Something went wrong" error Phase 1 first diagnosed as a missing-SMTP-config
  problem — except SMTP *is* configured here (Ethereal). `communications-service`'s own access log
  showed a couple of `POST /api/notifications/email` lines with no completion status logged at all
  (Morgan logs `-`/`-` when a request errors out before the response completes) during the affected
  window — consistent with Ethereal's free tier occasionally dropping a send under sustained
  concurrent load (~100+ real SMTP sends in a few minutes across the full suite), not a code bug.
  Confirmed by re-running the exact same specs that failed, isolated from the rest of the suite —
  they passed cleanly. **Before treating a full-suite failure as a regression, re-run just the failed
  spec file(s) on their own first** — if they pass isolated, it's very likely this same class of
  transient SMTP flakiness, not something to debug in the app or test code.
- **A real bug, not flakiness, on a second full run: `cy.apiRegisterOrganization()`'s generated GST
  number had too small a keyspace** — it derived its 4 varying digits from a `Date.now()` +
  3-digit-random string but kept all 5 letters fixed (`"CYPRS"`), giving only 10,000 possible GST
  numbers. A full-suite run registers several dozen organizations in quick succession, and a genuine
  409 (`"This GST number is already registered."`) surfaced as a `before` hook failure once that was
  actually a same-org-name collision, not SMTP-related at all. Fixed by deriving 3 of the 5 letters
  from a *different* digit window of the same unique string (`~175M` combinations instead of
  `10,000`) — confirmed fixed by re-running the affected spec plus 001/002 (which also assert GST
  format/uniqueness) together. Worth remembering: **not every full-suite-only failure is SMTP
  flakiness** — check the actual error status/body first (409 "already registered" is a real
  collision; a bare 500 with no error detail is the SMTP-flakiness pattern above).

## Next step

Phases 1-4 are done (see Status above). Phase 5 (Trip Management: `018`-`021`) is next. It needs a
Category to exist (via `cy.apiCreateCategory()`) before a trip-linked claim can reference one, but
Trip creation/listing themselves are simpler, single-screen flows per `frontend/CLAUDE.md`'s own
description (no multi-step wizard) — expect this phase to be lighter than Phase 4.
