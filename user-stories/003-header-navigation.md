# 003 - Header Navigation

**Status:** Draft
**Epic:** Header Navigation

## Overview

Covers the global header shown on every authenticated (`(private)/*`) screen, replacing the placeholder header that currently only shows the logo and a "Log out" button (see [001-authentication.md](./001-authentication.md)'s Dashboard). The header exposes top-level navigation (Home, Trips, Claims, Approvals, Finance, Reports, Company Settings, Help) plus a Profile menu (current user + organization, View Profile, Logout). This story also covers the one Company Settings sub-item that is fully functional today — **Associated Organizations**, which lets a user switch which of their organizations is active. Every other destination (Trips, Claims, Approvals, Finance, Reports, Help, and the remaining Company Settings sub-items) is a placeholder page — this story defines the navigation shell, not those features' behavior; see Out of Scope.

This story **supersedes one specific deferral** in [002-organization-signup.md](./002-organization-signup.md): that story's Out of Scope explicitly excluded "any 'switch organization' UI," reasoning that the `User`↔`Organization` data model needed to stay many-to-many so a switch feature could be added later without a breaking migration. This story is that later feature — see [Open Questions](#open-questions--assumptions).

---

## Story: Header Navigation

**As a** logged-in user
**I want** a consistent header with links to every major area of the app
**So that** I can get to any part of Finance Management from anywhere without relying on the browser back button

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Header (all private pages) | Home | nav link → Dashboard (`/dashboard`) | — |
| Header | Trips | nav link → placeholder | — |
| Header | Claims | nav link → placeholder | — |
| Header | Approvals | nav link → placeholder | — |
| Header | Finance | nav link → placeholder | — |
| Header | Reports | nav link → placeholder | — |
| Header | Company Settings | nav link → Employee management; also reveals the Company Settings sub-header (below) on every Company Settings page | — |
| Header sub-header (shown only while on a Company Settings page) | Employee management | nav link → placeholder | — |
| Header sub-header | Categories management | nav link → placeholder | — |
| Header sub-header | Roles & privileges | nav link → placeholder | — |
| Header sub-header | Grades | nav link → placeholder | — |
| Header sub-header | Departments | nav link → placeholder | — |
| Header sub-header | Associated Organizations | nav link → Switch Active Organization screen (functional, see next story) | — |
| Header | Help | nav link → placeholder | — |
| Header | Profile | menu trigger (expands submenu) | — |
| Header → Profile submenu | User name + current organization name | text (display only, not a link) | — |
| Header → Profile submenu | View Profile | nav link → placeholder | — |
| Header → Profile submenu | Logout | action button | — |

### Flow

1. On every authenticated page, the header renders using the user/organization already fetched via `GET /api/auth/me` (no separate fetch for the header itself — the calling page passes it down or the header reads it from wherever that page already stores it).
2. Clicking any top-level link (Home, Trips, Claims, Approvals, Finance, Reports, Company Settings, Help) navigates directly to that page — **Company Settings is a plain nav link, not a menu trigger**: it navigates straight to Employee management (the first sub-item), the same as any other top-level item.
3. Whenever the current page is anywhere under Company Settings (Employee management, Categories management, Roles & privileges, Grades, Departments, or Associated Organizations), the header shows a second row directly beneath it — a **sub-header** — listing all six Company Settings destinations as plain links. This row is not a popup/overlay and does not need to be opened or closed; it simply appears while on one of those pages and disappears when navigating elsewhere, the same way a browser tab bar reflects the current section.
4. Clicking **Profile** expands a submenu (disclosure pattern): `aria-expanded` reflects state, the trigger is keyboard-operable (Enter/Space to open, Escape to close), and the submenu closes when the user clicks outside it or presses Escape. Profile is the only menu-trigger-style item in the header — Company Settings uses the sub-header pattern instead (see above).
5. The header visually marks whichever top-level item corresponds to the current route as active (e.g. underline/background), so the user always knows where they are. Company Settings is marked active whenever the current route is under `/company-settings/*`, not just on an exact match — this does not apply to Profile's own trigger, since it's a menu, not a destination itself. Within the sub-header, the specific current sub-item is also marked active.
6. Clicking a Company Settings sub-header item other than Associated Organizations, or Help, or View Profile navigates to that page's placeholder screen (a simple "Coming soon" message — see [Out of Scope](#out-of-scope)).
7. Clicking **Associated Organizations** navigates to the Switch Active Organization screen (see next story).
8. Clicking **Logout** calls the existing logout API (`POST /api/auth/logout`, already used by the Dashboard today) and redirects to Login — this is a relocation of existing behavior into the shared header, not new behavior.
9. There is no scenario in this story where a menu item is hidden or disabled based on who's logged in — every item is visible to every authenticated user (see [Open Questions](#open-questions--assumptions)).

### Validation Rules

Not applicable — this story is pure navigation with no user-entered fields.

### Acceptance Criteria

- **Given** any authenticated page, **when** it renders, **then** the header shows all top-level items (Home, Trips, Claims, Approvals, Finance, Reports, Company Settings, Help, Profile).
- **Given** the user is on a page corresponding to a top-level item, **when** the header renders, **then** that item is visually marked as active.
- **Given** the user clicks Company Settings from any other page, **when** the page loads, **then** they land on Employee management and the sub-header appears beneath the main header showing all six Company Settings links.
- **Given** the user is on any Company Settings page, **when** the header renders, **then** the sub-header is visible with the current sub-item marked active, and Company Settings itself is marked active in the main header.
- **Given** the user navigates away from Company Settings to any other top-level item, **when** the next page renders, **then** the sub-header disappears.
- **Given** the Profile submenu is open, **when** the user presses Escape or clicks outside it, **then** it closes and `aria-expanded` returns to `false`.
- **Given** the user clicks a placeholder destination (Trips, Claims, Approvals, Finance, Reports, Help, View Profile, or any Company Settings sub-header item except Associated Organizations), **when** the page loads, **then** a "Coming soon" placeholder screen is shown, not an error or blank page.
- **Given** the user opens the Profile submenu, **when** it renders, **then** it shows the current user's name and their currently active organization's name (matching whatever `GET /api/auth/me` last returned).
- **Given** the user clicks Logout from the Profile submenu, **when** the logout call succeeds, **then** the session cookie is cleared and the user is redirected to Login — identical to the Dashboard's existing Logout behavior.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Logout server/network error | "Something went wrong. Please try again." (identical to existing Dashboard behavior) |

---

## Story: Switch Active Organization

**As a** user who belongs to more than one organization
**I want** to see which organizations I'm a member of and choose which one is active
**So that** the app reflects the organization I'm currently working in

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Associated Organizations | Organization list (name + GST Number per row, active one marked) | list | — |
| Associated Organizations | Switch button (per row, disabled on the already-active row) | button | — |
| Associated Organizations | "← Back" link | link → previous page | — |

### Flow

1. On page load, frontend calls `GET /api/organizations/mine`, which returns every organization the current user is a member of, each flagged `isActive` if it matches the user's `activeOrganizationId`.
2. The currently active organization's row is visually marked and its Switch button is disabled (nothing to switch to).
3. Clicking Switch on a non-active row calls `PATCH /api/users/me/active-organization` with that organization's id.
   - **Success** → backend updates `User.activeOrganizationId`, returns the new active organization; frontend shows a success toast, re-marks the new active row, and updates the Profile submenu's displayed organization name immediately (no full page reload required).
   - **Organization id not one of the user's memberships** → 403; frontend shows a generic error toast and the list stays unchanged (this should not be reachable through normal UI use — the list only ever renders the caller's own memberships — but the backend enforces it regardless of what the client sends).
4. Any unexpected server error on load or switch → generic error toast; on load failure, the screen shows a retry affordance (same pattern as the Dashboard's existing load-error state).
5. If the user has exactly one organization (the common case today, since [002-organization-signup.md](./002-organization-signup.md) only ever creates one organization per new signup), the list shows that single row with Switch disabled — there is nothing to switch to, but the screen is not hidden or an error state.

### Validation Rules

| Field | Rule |
|-------|------|
| `organizationId` (switch request) | Required. Must correspond to an `organization_members` row for the calling user; otherwise rejected with 403. |

### Acceptance Criteria

- **Given** a user with multiple organization memberships, **when** they open Associated Organizations, **then** every organization they belong to is listed with the active one clearly marked.
- **Given** the user clicks Switch on a non-active organization, **when** the request succeeds, **then** that organization becomes active, a success toast is shown, and the Profile submenu reflects the new organization name without a full reload.
- **Given** the user clicks Switch on the already-active organization, **then** nothing happens — the button is disabled for that row.
- **Given** a user with only one organization, **when** they open this screen, **then** they see that single organization listed with Switch disabled, not an empty or error state.
- **Given** a switch request for an organization the user does not belong to (e.g. a stale/tampered request), **when** the backend processes it, **then** it is rejected with 403 and no change is made.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Switch succeeded | "Organization switched." |
| Switch rejected (not a member) | "Something went wrong. Please try again." |
| Server/network error (load or switch) | "Something went wrong. Please try again." |

---

## API Design

New endpoints, following the existing `{ error: string }` error convention:

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| GET | `/api/organizations/mine` | — (session cookie) | `{ organizations: [{ id, name, gstNumber, isActive }] }` |
| PATCH | `/api/users/me/active-organization` | `{ organizationId }` | `{ organization: { id, name, gstNumber } }` |

`GET /api/auth/me`'s existing response shape (`{ user, organization }`, see [001](./001-authentication.md)'s API Design) is unchanged — `organization` now reflects `User.activeOrganizationId` instead of "first membership found," so every existing caller of `/me` (Dashboard, and the header itself) automatically shows the correct active organization with no contract change.

Error responses: 400 (missing/malformed `organizationId`), 403 (`organizationId` isn't one of the caller's memberships), 401 (no session), 500 (unexpected).

## Data Model Change

- Add `activeOrganizationId` (nullable FK → `organizations.id`) to `User`.
- Migration backfills every existing user's `activeOrganizationId` to their current (first, and today always only) `organization_members` row — so no behavior changes for any existing account until they actually use Switch.
- `getCurrentOrganization(userId)` (in `backend/src/utils/auth.ts`) changes from "first membership found" to reading `User.activeOrganizationId` directly, falling back to first membership only if that column is unexpectedly null.

## Validation Rules Summary

No new field-format rules beyond the `organizationId` membership check above — this story introduces no free-text input.

## Test Cases

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|------------------|
| TC-01 | Header renders on any private page | Load Dashboard (or any placeholder page) while logged in | All top-level items visible; current page's item marked active |
| TC-02 | Company Settings navigates and reveals sub-header | Click "Company Settings" from Dashboard | Navigates to Employee management; sub-header appears with all 6 links, Employee management marked active |
| TC-03 | Sub-header persists across Company Settings pages | From Employee management, click "Grades" in the sub-header | Navigates to Grades; sub-header still visible, Grades now marked active, Company Settings still marked active in the main header |
| TC-04 | Sub-header disappears outside Company Settings | From any Company Settings page, click "Home" | Navigates to Dashboard; sub-header is gone |
| TC-05 | Keyboard-only navigation | Tab to "Company Settings", press Enter, then Tab through the sub-header links | Company Settings link and every sub-header link are reachable and activatable via keyboard, same as any other nav link |
| TC-06 | Placeholder destination | Click "Trips" (or Claims/Approvals/Finance/Reports/Help/View Profile/any sub-header item except Associated Organizations) | "Coming soon" placeholder page renders, no error |
| TC-07 | Profile submenu shows identity | Open Profile submenu | Current user's name and active organization's name are shown |
| TC-08 | Logout from header | Open Profile submenu, click Logout | Session cookie cleared, redirected to Login |
| TC-09 | Associated Organizations, multiple orgs | User belongs to 2+ orgs, opens Associated Organizations | All orgs listed, active one marked, Switch enabled on the others |
| TC-10 | Switch organization succeeds | Click Switch on a non-active org | Success toast, that org marked active, Profile submenu updates immediately |
| TC-11 | Switch disabled on active org | Observe the currently-active row | Switch button is disabled |
| TC-12 | Associated Organizations, single org | User belongs to exactly one org, opens the screen | That org listed, Switch disabled, no error/empty state |
| TC-13 | Switch to a non-member organization (tampered request) | Send `PATCH /api/users/me/active-organization` with an `organizationId` the user doesn't belong to | 403, no change, generic error toast |
| TC-14 | Server/network error loading Associated Organizations | `GET /api/organizations/mine` fails | Generic error toast, retry affordance shown |

## Edge Cases

- **Header data source**: the header must not trigger its own duplicate `GET /api/auth/me` call on top of whatever the hosting page already does — it consumes the same fetched user/organization, consistent with avoiding redundant network calls.
- **Active-org highlight staleness**: after a successful switch, every place the active organization's name appears (Profile submenu, and if a future page displays it) must reflect the new value immediately from the switch response, without waiting for a page reload or a fresh `/me` call.
- **Single-organization accounts**: today, every account has exactly one organization (per [002](./002-organization-signup.md)'s current scope), so Switch is disabled everywhere until a future story allows joining/creating a second organization — Associated Organizations must not assume multiple rows will normally exist.
- **Route protection**: every new route this story introduces (Trips, Claims, Approvals, Finance, Reports, Help, Company Settings sub-routes, Profile, Associated Organizations) is an authenticated route and must be added to `src/proxy.ts`'s matcher at implementation time, per `frontend/CLAUDE.md`'s existing rule — omitting one would let it render without a session check.
- **Browser refresh**: the active organization is server-side state (`User.activeOrganizationId`), not frontend-only — a refresh or new tab always reflects the true current value via `/me`, unlike the in-memory wizard state used by 001/002's multi-step flows.

## Out of Scope

- Real functionality behind Trips, Claims, Approvals, Finance, Reports, Help, View Profile, Employee management, Categories management, Roles & privileges, Grades, and Departments — each renders a placeholder page in this story; their actual behavior is future, separately-scoped stories.
- Role-based menu visibility or authorization of any kind — every logged-in user sees and can access every item, including all of Company Settings, regardless of their `OrganizationMember.role`. The codebase has no enforcement point for `role` today; adding one is a distinct future story.
- Creating a new organization or joining/inviting into an additional one from the Associated Organizations screen — this story is switch-only among organizations the user is already a member of.
- Mobile/responsive-specific header behavior (e.g. a hamburger/collapsed menu) beyond keyboard and ARIA accessibility — no distinct mobile design was specified.
- Persisting "last active organization" across logout/login as anything other than the same `activeOrganizationId` column (i.e., no separate "remember me" concept).

## Open Questions / Assumptions

- **This story supersedes part of [002-organization-signup.md](./002-organization-signup.md)'s Out of Scope**: 002 explicitly excluded "any 'switch organization' UI" and left the exact mechanism as an open question, while deliberately modeling `User`↔`Organization` as many-to-many specifically so this would be possible later without a breaking migration. This story is that later feature. 002's document is not edited retroactively — this note is the linkage between the two.
- **"Home" reuses the existing Dashboard route** (`/dashboard`) rather than introducing a separate synonymous route — flagged so it isn't mistaken for a missing item during implementation.
- **Company Settings visibility is a deliberate decision, not an oversight**: every logged-in user sees the full Company Settings sub-header today because no role/permission enforcement exists yet. [007](./007-associated-organizations-network.md) later built the first real permission check (owner-only, on `Employee.isOwner` — originally `OrganizationMember.role`, moved when `User` merged into `Employee`, see [008](./008-employee-invitation.md)'s epic) but only for its own single nav link; the rest of Company Settings still shows to everyone.
- **Company Settings is a sub-header, not a dropdown — a mid-implementation design change**: the first implementation used a popup disclosure menu (matching Profile's pattern) for Company Settings' six destinations. It was changed to a second nav row that appears while on any Company Settings page, since the six destinations are peer sections a user moves between (like tabs), not one-off actions picked from a transient menu. Profile intentionally keeps the dropdown pattern — its contents (identity display, View Profile, Logout) are a single miscellaneous action set, not a set of pages to switch between.
- **Placeholder page content**: this story assumes a minimal, identical "Coming soon" placeholder is sufficient for every non-functional destination; no distinct copy/design per page is specified.
- **The "Switch Active Organization" screen (this story's own feature, below) was removed entirely, at explicit request, when `User` was merged into `Employee` (see [008](./008-employee-invitation.md)'s epic and `backend/CLAUDE.md`'s "The User → Employee merge")**: `Employee` is permanently scoped to exactly one organization, so multi-organization membership — the entire premise of this screen — no longer exists. `PATCH /api/users/me/active-organization`, `GET /api/organizations/mine`, and the frontend's `company-settings/organizations/page.tsx` were all deleted; the Company Settings sub-header no longer links to it. The rest of this story (header nav, Company Settings sub-header, placeholder pages) is unaffected and still describes the current implementation accurately — only the "Switch Active Organization" section below is now historical, describing a feature that existed and was later removed, not one that's still live.
