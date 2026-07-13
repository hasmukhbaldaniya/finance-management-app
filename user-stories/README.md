# User Stories

Product requirements for Finance Management, written as user stories before any UI or backend implementation starts. This directory is the single source of truth for "what should this feature do" — implementation plans and code reference these files, not the other way around.

## Convention

- **Numbering**: `NNN-epic-name.md`, zero-padded three digits, incrementing. The next story after `001-authentication.md` is `002-...`.
- **One file per epic**: a file can bundle multiple tightly-coupled flows as separate `## Story: <name>` sections (e.g. `001-authentication.md` covers both Login and Forgot Password, since they share the same screens/fields/validation source of truth). Only split an epic into its own additional file if it stops being tightly coupled to the others. **Exception**: `008`/`009`/`010`/`011` are all one epic (Employee Management) split across four files at explicit request, because the epic was large enough that each story (the invite wizard, the listing + lifecycle actions, bulk CSV/XLSX import, and the invited employee's own onboarding flow) has its own substantial API and data-model surface — not the default, but a documented deviation rather than a silent one. `011` was added later than the other three, once the epic's original "3 stories" framing needed a fourth. Likewise, `013`/`014`/`015`/`016` are one epic (Category Management) split across four files for the same reason — creation (a 4-step wizard in its own right), listing plus lifecycle actions, edit/duplicate, and the versioning scheme each carry enough independent API/data-model weight to warrant their own file. `018`/`019`/`020`/`021` are one epic (Trip Management) split the same way — creation, the "My Trips" listing (search/filters/pagination/delete), the read-only Trip Details page, and editing a still-`"new"` trip each own their own API/data-model surface, mirroring `013`/`014`/`016`/`015` exactly. `022`/`023`/`024`/`025` are one epic (Claim Management) split the same way — the shared entry point plus Manual Add Claim, the AI-Powered (Automated Extraction) flow with its own AI/ML service, the "My Claim" listing, and Split Claim (cross-employee expense sharing) each own their own API/data-model surface. **`025` redefines what "Split Claim"/"Split Request" mean versus `022`/`024`'s own earlier text** — see `025`'s own Overview for the conflict and its recommended resolution; not yet applied to `022`/`024`'s own wording or to the already-shipped code.
- **Status**: every file starts with a metadata block including `Status: Draft | Ready | In Progress | Done`.
  - `Draft` — being written/reviewed, not yet ready to implement.
  - `Ready` — reviewed and approved, safe to plan implementation from.
  - `In Progress` — implementation under way.
  - `Done` — shipped.
- **Adding a new story**: copy `TEMPLATE.md` to the next `NNN-epic-name.md`, fill it in, and set `Status: Draft` until it's reviewed.
- **Navigation**: every screen in a multi-step/wizard flow must explicitly specify, as its own Screens & Fields row, how the user leaves it — back to the previous step and/or back to a natural entry point (e.g. Login) — with the resulting behavior covered in Acceptance Criteria. Don't rely on the browser's back button as the only way out; it was missed in the first pass of `001-authentication.md` and had to be retrofitted after manual testing.

## Index

| # | File | Status |
|---|------|--------|
| 001 | [Authentication](./001-authentication.md) | Draft |
| 002 | [Organization Signup](./002-organization-signup.md) | Draft |
| 003 | [Header Navigation](./003-header-navigation.md) | Draft |
| 004 | [Grade Management](./004-grade-management.md) | Draft |
| 005 | [Department Management](./005-department-management.md) | Draft |
| 006 | [Roles & Privileges Management](./006-roles-and-privileges-management.md) | Draft |
| 007 | [Associated Organizations (Network)](./007-associated-organizations-network.md) | Draft |
| 008 | [Employee Invitation](./008-employee-invitation.md) | Draft |
| 009 | [Employee Listing](./009-employee-listing.md) | Draft |
| 010 | [Bulk Invite Employees](./010-bulk-invite-employees.md) | Implemented |
| 011 | [Employee Onboarding](./011-employee-onboarding.md) | Draft |
| 012 | [Employee Profile](./012-employee-profile.md) | Done |
| 013 | [Category Creation](./013-category-creation.md) | Draft |
| 014 | [Category Listing](./014-category-listing.md) | Draft |
| 015 | [Category Edit and Duplicate](./015-category-edit-and-duplicate.md) | Draft |
| 016 | [Category Version History](./016-category-version-history.md) | Draft |
| 017 | [Zoho SalesIQ Integration](./017-zoho-salesiq-integration.md) | Draft |
| 018 | [Trip Creation](./018-trip-creation.md) | Draft |
| 019 | [Trip Listing](./019-trip-listing.md) | Draft |
| 020 | [Trip Details](./020-trip-details.md) | Draft |
| 021 | [Trip Edit](./021-trip-edit.md) | Draft |
| 022 | [Claim Creation: Entry Point & Manual Claim](./022-claim-creation-manual.md) | Draft |
| 023 | [Claim Creation: AI-Powered (Automated Extraction)](./023-claim-creation-ai-powered.md) | Draft |
| 024 | [My Claim Listing](./024-my-claim-listing.md) | Draft |
| 025 | [Split Claim: Sharing an Expense With Colleagues](./025-claim-split-request.md) | Draft |
| 026 | [MUI Migration](./026-mui-migration.md) | Draft |
