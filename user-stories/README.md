# User Stories

Product requirements for Finance Management, written as user stories before any UI or backend implementation starts. This directory is the single source of truth for "what should this feature do" — implementation plans and code reference these files, not the other way around.

## Convention

- **Numbering**: `NNN-epic-name.md`, zero-padded three digits, incrementing. The next story after `001-authentication.md` is `002-...`.
- **One file per epic**: a file can bundle multiple tightly-coupled flows as separate `## Story: <name>` sections (e.g. `001-authentication.md` covers both Login and Forgot Password, since they share the same screens/fields/validation source of truth). Only split an epic into its own additional file if it stops being tightly coupled to the others. **Exception**: `008`/`009`/`010`/`011` are all one epic (Employee Management) split across four files at explicit request, because the epic was large enough that each story (the invite wizard, the listing + lifecycle actions, bulk CSV/XLSX import, and the invited employee's own onboarding flow) has its own substantial API and data-model surface — not the default, but a documented deviation rather than a silent one. `011` was added later than the other three, once the epic's original "3 stories" framing needed a fourth.
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
