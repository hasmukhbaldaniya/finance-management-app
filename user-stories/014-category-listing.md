# 014 - Category Listing

**Status:** Draft
**Epic:** Category Management

## Overview

Covers the "My Categories" screen under Company Settings → Categories Management — a paginated grid of category cards, each showing enough at a glance to know what it is, whether it's still being set up, and when it last changed, plus three actions that act on the category as a whole without opening the wizard: **Delete** (draft categories only), and **Enable/Disable** (active categories only, via a toggle). Two other actions visible on each card — **Duplicate** and **Edit**, plus clicking the card itself (Category Details) and its **Version History** link — are documented in their own stories ([015-category-edit-and-duplicate.md](./015-category-edit-and-duplicate.md) and [016-category-version-history.md](./016-category-version-history.md) respectively); this story only establishes that those entry points exist on the card, not what happens after them.

**Scope note**: the reference screenshots show two tabs above the grid, "Cost Categories" (active) and "Daily Allowance". **This story, and the rest of the Category Management epic so far ([013](./013-category-creation.md), [015](./015-category-edit-and-duplicate.md), [016](./016-category-version-history.md)), covers Cost Categories only** — confirmed out of scope for Daily Allowance, a separate, not-yet-specified feature. The tab itself may exist in the UI (matching the screenshot) but has no specified behavior here.

---

## Story: View My Categories

**As a** Company Administrator
**I want to** see all of my organization's expense categories at a glance, with pagination
**So that** I can find and manage them without loading everything at once

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| My Categories | Page title "My Categories" | heading | — |
| My Categories | "+ Create Category" button | button → [013](./013-category-creation.md)'s Step 1 | — |
| My Categories | Tabs: "Cost Categories" / "Daily Allowance" | tabs | Cost Categories is the only functional tab (see Overview) |
| My Categories | Category card (repeated, one per category) | card | see fields below |

**Each category card shows**:

| Field | Notes |
|-------|-------|
| Category Name | bold, top-left |
| "Draft" badge | shown only if `status: "draft"` — **an active category shows no status badge at all**, not an "Active" badge; absence of the badge *is* the active signal |
| "Version History" link | top-right, opens the drawer — see [016](./016-category-version-history.md) |
| Description | shown below the name, truncated with an ellipsis if it overflows the card's available lines |
| "Last updated {date, time}" | a pill-styled label, e.g. "Last updated Jul 8, 2026, 2:18 PM" |
| Duplicate icon | always shown — see [015](./015-category-edit-and-duplicate.md) |
| Delete icon | **shown only for `status: "draft"` categories** — not rendered at all once active |
| Edit icon | always shown — see [015](./015-category-edit-and-duplicate.md) |
| Enable/Disable toggle | shown always, but **disabled/non-interactive while `status: "draft"`** — see the lifecycle story below |

### Flow

1. The grid loads the first page of the organization's Cost Categories, most-recently-updated first (no other sort option is specified — see [Open Questions](#open-questions--assumptions)).
2. **Pagination is infinite-scroll**, matching every other paginated listing in this codebase (Grade/Department/Roles/Employee Listing's `useInfiniteScroll` hook, per `frontend/CLAUDE.md`) — a sentinel element near the bottom of the grid triggers loading the next page as the admin scrolls, with a spinner shown while that request is in flight; there's no page-number control.
3. Clicking anywhere on a card's body (not one of its icons/toggle/links) navigates to the Category Details page for that category's latest version — see [016](./016-category-version-history.md).
4. Clicking "Version History" opens the version drawer for that category — see [016](./016-category-version-history.md).
5. An empty organization (zero categories created yet) shows an empty state directing the admin to "+ Create Category" instead of a blank grid.

### Acceptance Criteria

- **Given** a category with `status: "draft"`, **when** its card renders, **then** it shows a "Draft" badge, a Delete icon, and a disabled Enable/Disable toggle.
- **Given** a category with `status: "active"`, **when** its card renders, **then** it shows no status badge, no Delete icon, and an interactive Enable/Disable toggle reflecting its current `isEnabled` value.
- **Given** more categories exist than fit on one page, **when** the admin scrolls near the bottom of the grid, **then** the next page loads automatically with a loading indicator, appended to the existing cards.
- **Given** zero categories exist, **when** the page loads, **then** an empty state with a "+ Create Category" call-to-action shows instead of an empty grid.
- **Given** a long Description, **when** the card renders, **then** it's visually truncated (ellipsis) rather than expanding the card's height indefinitely.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Failed to load the category list | "Something went wrong. Please try again." |

---

## Story: Delete Category (Draft only)

**As a** Company Administrator
**I want to** delete a category I'm still setting up
**So that** I can discard one I started by mistake or no longer need, before it's ever used

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| My Categories | Delete icon (per draft card) | button → opens confirmation dialog | Not rendered for active categories at all |
| Delete Category dialog | Title "Delete Category?" | — | — |
| Delete Category dialog | Body: `Are you sure you want to delete "{Category Name}"? This action cannot be undone.` | — | — |
| Delete Category dialog | "No" button | button → closes dialog, no change | — |
| Delete Category dialog | "Yes, Delete" button | button → deletes | destructive styling |

### Flow

1. Clicking the Delete icon on a draft category's card opens the confirmation dialog above, naming that specific category.
2. **"No"** closes the dialog with no effect.
3. **"Yes, Delete"** permanently deletes the category (and everything under it — fields, policies, any draft-only version record) and removes its card from the grid.
4. Deleting is only ever possible while `status: "draft"` — once a category has ever been activated, deletion isn't offered anywhere in this story (see [Out of Scope](#out-of-scope)).

### Validation Rules

| Rule | Detail |
|------|--------|
| Deletable only while `status: "draft"` | Enforced both by not rendering the Delete icon for active categories, and server-side on the delete endpoint itself, not just hidden client-side. |

### Acceptance Criteria

- **Given** a draft category, **when** its Delete icon is clicked, **then** the confirmation dialog opens naming that category.
- **Given** the confirmation dialog is open, **when** "No" is clicked, **then** it closes and the category is untouched.
- **Given** the confirmation dialog is open, **when** "Yes, Delete" is clicked, **then** the category is removed from the database and disappears from the grid.
- **Given** an attempt to call the delete endpoint directly on an `active` category (bypassing the UI, which never shows the icon for one), **when** the request is made, **then** it's rejected server-side.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Delete succeeded | "Category deleted." |
| Attempt to delete an active category | "Only draft categories can be deleted." |
| Server/network error | "Something went wrong. Please try again." |

---

## Story: Enable / Disable Category (Active only)

**As a** Company Administrator
**I want to** temporarily stop an active category from being used, and turn it back on later
**So that** I can pause a category without losing its configuration or deleting it

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| My Categories | Enable/Disable toggle (per card) | toggle | Disabled/non-interactive while `status: "draft"`; interactive once `status: "active"` |
| Enable Category dialog | Title "Enable Category?" | — | Shown when toggling from off → on |
| Enable Category dialog | Body: "Are you sure you want to enable this category?" | — | — |
| Enable Category dialog | "No" / "Yes, Enable" buttons | — | — |
| Disable Category dialog | Title "Disable Category?" | — | Shown when toggling from on → off — **confirmed symmetric with Enable**, unlike Employee Listing's Suspend/Activate asymmetry |
| Disable Category dialog | Body: "Are you sure you want to disable this category?" | — | — |
| Disable Category dialog | "No" / "Yes, Disable" buttons | — | — |

### Flow

1. The toggle reflects `isEnabled` — on (green) when enabled, off (grey) when disabled. It's only interactive once `status: "active"`; a draft category's toggle is always shown off and disabled regardless of any `isEnabled` value it may internally hold, since a draft was never usable to begin with.
2. Clicking the toggle **always opens a confirmation dialog first, in both directions** — "Enable Category?" when turning it on, "Disable Category?" when turning it off. Neither direction applies instantly; this is a deliberate departure from [009](./009-employee-listing.md)'s Employee Listing, where Activate is instant and only Suspend confirms.
3. Confirming updates `isEnabled` and the toggle's visual state; declining ("No") leaves it untouched.
4. Disabling a category doesn't delete or archive it — it stays fully configured, still shown on the listing (with the toggle now off), and can be re-enabled at any time. What disabling actually prevents at claim-submission time (e.g. can employees still see/select this category when filing a new expense?) is intentionally not specified here — see [Out of Scope](#out-of-scope).

### Validation Rules

| Rule | Detail |
|------|--------|
| Toggle only interactive while `status: "active"` | Enforced client-side (disabled control) and server-side (the enable/disable endpoint rejects a request against a still-`draft` category). |

### Acceptance Criteria

- **Given** a draft category, **when** the admin looks at its toggle, **then** it's visibly disabled and can't be clicked.
- **Given** an active, currently-disabled category, **when** the toggle is clicked, **then** an "Enable Category?" confirmation opens.
- **Given** an active, currently-enabled category, **when** the toggle is clicked, **then** a "Disable Category?" confirmation opens.
- **Given** either confirmation dialog, **when** "No" is clicked, **then** the toggle's state is unchanged.
- **Given** either confirmation dialog, **when** the affirmative button is clicked, **then** `isEnabled` flips and the toggle's visual state updates to match.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Category enabled | "Category enabled." |
| Category disabled | "Category disabled." |
| Attempt to toggle a draft category (bypassing the UI) | "Only active categories can be enabled or disabled." |
| Server/network error | "Something went wrong. Please try again." |

---

## API Design

| Method | Path | Body / Query | Response (success) |
|--------|------|---------------|---------------------|
| GET | `/api/categories?page=&pageSize=` | — (query params; defaults `page=1`, a `pageSize` matching this codebase's other infinite-scroll listings) | `{ categories: [{ id, name, description, status, isEnabled, updatedAt }], hasMore: boolean }` |
| DELETE | `/api/categories/:id` | — | `{ message }` — 400/409 if the category isn't `"draft"` |
| PATCH | `/api/categories/:id/status` | `{ isEnabled: boolean }` | `{ category: { id, isEnabled } }` — 400/409 if the category isn't `"active"` |

Error responses follow the existing convention (`{ error: string }`): 400 (wrong lifecycle state for the action), 401 (no session), 403 (not a Company Administrator — same `requireOwner` gate as [013](./013-category-creation.md)), 404 (category not found or not in this organization), 500 (unexpected).

## Data Model

No new tables — this story reads and writes the `Category` row [013](./013-category-creation.md) already defines (`status`, `isEnabled`), and deletes `Category` plus its cascaded `CategoryField`/`CategoryPolicy`/etc. rows. Deleting a draft category also removes whatever draft-only version placeholder [016](./016-category-version-history.md) tracks for it, since real numbered versions are never created until the category leaves draft.

## Validation Rules Summary

| Field | Rule |
|-------|------|
| Delete action | Available only while `status: "draft"`, enforced client- and server-side. |
| Enable/Disable toggle | Interactive only while `status: "active"`, enforced client- and server-side. Both directions require confirmation. |

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| CL-01 | Load the listing with categories in both draft and active states | Draft cards show the Draft badge, Delete icon, and disabled toggle; active cards show none of those and an interactive toggle |
| CL-02 | Scroll to the bottom of a multi-page list | Next page loads automatically, appended below existing cards |
| CL-03 | Load the listing with zero categories | Empty state with "+ Create Category" shown |
| CL-04 | Click a card's body (not an icon) | Navigates to Category Details for that category's latest version |
| CL-05 | Delete a draft category, confirm | Category removed from the grid and database |
| CL-06 | Delete a draft category, decline | Category unchanged, dialog closes |
| CL-07 | Attempt `DELETE /api/categories/:id` on an active category directly | Rejected with a 400/409 error |
| CL-08 | Toggle an active, enabled category off, confirm | Category becomes disabled, toggle shows off |
| CL-09 | Toggle an active, disabled category on, confirm | Category becomes enabled, toggle shows on |
| CL-10 | Toggle either direction, then click "No" | No change |
| CL-11 | Attempt `PATCH /api/categories/:id/status` on a draft category directly | Rejected with a 400/409 error |
| CL-12 | Non-owner employee loads the listing or attempts any lifecycle action | 403, same as every other Company-Administrator-gated endpoint in this epic |

## Edge Cases

| Scenario | Expected Result |
|----------|------------------|
| A category is disabled while an employee has it open in a claim form elsewhere | Out of scope here — this story doesn't define claim-time enforcement, only the admin-facing toggle (see Out of Scope) |
| Two admins toggle the same category at nearly the same time | Last write wins, same level of rigor as every other multi-admin write path in this codebase |
| A draft category with an extremely long, unsaved-in-progress configuration is deleted mid-edit by a second admin while the first is still on the wizard | The first admin's next save fails with a 404 (category no longer exists) — no special recovery/merge behavior is specified |
| Pagination request for a page beyond the last one | Returns an empty `categories` array with `hasMore: false`, not an error |

## Out of Scope

- Search, filter, or sort controls on the listing (beyond the default most-recently-updated ordering) — not specified in the source request.
- What disabling a category actually prevents at claim-submission time (whether employees can still select/see it when filing a new expense, whether in-flight claims already using it are affected) — this story only covers the admin-facing toggle and its confirmation, not runtime enforcement.
- Bulk actions (multi-select delete/enable/disable across several categories at once).
- The Daily Allowance tab's actual behavior.
- Duplicate, Edit, Category Details, and Version History — each has its own dedicated story ([015](./015-category-edit-and-duplicate.md), [016](./016-category-version-history.md)).

## Open Questions / Assumptions

- **Default sort order (most-recently-updated first)** — not explicitly specified; assumed as the most natural default and the one the reference screenshots' card ordering is roughly consistent with. No alternate sort option is offered.
- **"Pagination as invite loading"** — interpreted as this codebase's existing infinite-scroll pattern (`useInfiniteScroll`, already used by Grade/Department/Roles/Employee Listing), not a literal reference to a different, unnamed "invite" screen. Flagged since the phrase itself is ambiguous, but this is the only pagination style that already exists anywhere in this codebase to reuse.
- **Runtime effect of disabling a category** is deliberately left unspecified (see Out of Scope) — worth settling before/during implementation, since "disabled but still fully visible and selectable everywhere" would make the toggle meaningless.
