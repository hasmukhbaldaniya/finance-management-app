# 016 - Category Version History

**Status:** Draft
**Epic:** Category Management

## Overview

Covers what happens to a category's configuration history once it's no longer just a draft: every time an **active** category (per [015-category-edit-and-duplicate.md](./015-category-edit-and-duplicate.md)'s Edit flow) is changed, a new **version** is recorded — a decimal-numbered, immutable snapshot of the category's full configuration at that point (`major.minor`, e.g. `11.0`, `11.1`, `12.0`) — and every version ever recorded stays viewable forever. This story covers three things together, since they're one continuous feature: the **Version History drawer** (opened from [014](./014-category-listing.md)'s listing card), the **versioning scheme** itself (when a version is created, and whether it's a major or minor bump), and the **Category Details page** (a read-only, version-aware view of a category's full configuration, reached either by clicking a listing card directly or a "View Details" link in the drawer).

**A draft category has no real version history yet.** Per the source request, a version isn't created until the category has actually been activated ([013](./013-category-creation.md)'s Step 4 Submit) — while still draft, the drawer shows a single placeholder entry labeled "Draft" instead of a numbered version list, since nothing about a draft is a finished, immutable snapshot worth preserving as one.

---

## Story: Version History Drawer

**As a** Company Administrator
**I want to** see every past version of a category and open any of them
**So that** I can understand what changed and when, and review exactly what a past configuration looked like

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| My Categories | "Version History" link (per card) | button → opens drawer | Present on every card, draft or active |
| Version History drawer | Title: `{Category Name} Version History` | — | — |
| Version History drawer (draft category) | Single entry: "Draft" / "Unsaved draft changes" / "View Details" | — | Shown instead of a version list |
| Version History drawer (active category) | One row per recorded version: version number, "Created At" timestamp, "Created By" (name \| email), "View Details" button | list | Newest first |

### Flow

1. Clicking "Version History" on any card opens a right-side drawer for that specific category.
2. **Draft categories** show exactly one entry — "Draft," subtitled "Unsaved draft changes," with an amber/in-progress-styled indicator dot (distinct from the green/grey dots used for real versions) — and its own "View Details" button, which opens the Category Details page showing the category's current live (unsaved-as-a-version) state.
3. **Active categories** show every version ever recorded for that category, newest at the top. Each row's indicator dot is **filled/highlighted (green) for major versions** (`X.0`) and **hollow/muted (grey) for minor versions** (`X.Y`, Y > 0) — purely visual, both are equally viewable.
4. Clicking any version's "View Details" navigates to the Category Details page, pre-selected to that exact version.
5. The drawer itself has no other actions (no delete/restore) — it's read-only, matching the Category Details page it links into.

### Acceptance Criteria

- **Given** a draft category, **when** its Version History is opened, **then** exactly one "Draft" entry shows, not a numbered version.
- **Given** an active category with N recorded versions, **when** its Version History is opened, **then** all N show, newest first, each with its own Created At/By and View Details.
- **Given** a major version (`X.0`), **when** the list renders, **then** its indicator dot is visually distinct (highlighted) from a minor version's.
- **Given** any version row, **when** "View Details" is clicked, **then** the Category Details page opens showing exactly that version's snapshot.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Failed to load version history | "Something went wrong. Please try again." |

---

## Story: Versioning Scheme — when a version is created, and major vs. minor

**As a** Company Administrator
**I want** meaningful, distinct versions rather than one per keystroke
**So that** the history is a useful record of real changes, not noise

### Flow

1. **A category's first version (`1.0`) is created automatically the moment it's activated** — [013](./013-category-creation.md)'s Step 4 Submit succeeding is what creates it, capturing the complete configuration (all 4 steps) exactly as submitted. This is the only version-creation trigger that isn't "an edit to an already-active category" — it's the transition into having versions at all.
2. **Editing an active category ([015](./015-category-edit-and-duplicate.md)) doesn't create a new version on every individual per-step save.** Each step still saves to its own endpoint immediately and independently, exactly as [013](./013-category-creation.md) already specifies — that part is unchanged. Instead, **a version is finalized once when the admin's edit session ends** (leaving the wizard via Cancel, navigating elsewhere, or closing it) — at that point, the category's current live state is compared, step by step, against its *previous* version's snapshot:
   - **If nothing actually changed**, no new version is created at all.
   - **If 1 or 2 of the 4 steps differ**, a **minor** version is recorded (`X.Y` → `X.(Y+1)`).
   - **If 3 or 4 of the 4 steps differ**, a **major** version is recorded (`X.Y` → `(X+1).0`, resetting the minor counter).
3. Each recorded version stores a full, immutable snapshot of the category's entire configuration at that moment (every field, every policy, across all 4 steps) — not a diff against the previous version — so that viewing any past version never depends on replaying history, only on reading that one stored snapshot directly.
4. "Created By" on a version is whichever admin's edit session produced it (or, for `1.0`, whoever completed Step 4's Submit).

### Validation Rules

| Rule | Detail |
|------|--------|
| Version numbering | `major.minor`, starting at `1.0` on activation. Minor increments within a major line; a major bump resets minor to `0`. |
| Major vs. minor threshold | 3 or 4 of the 4 wizard steps (Basic Details, Expense Form, Policies & Approvals, Project Based Policies & Approvals) differing from the previous version → major. 1 or 2 differing → minor. 0 differing → no version created. |
| Immutability | A recorded version's snapshot is never modified after the fact — only new versions are ever added. |

### Acceptance Criteria

- **Given** a draft category reaches Step 4's Submit, **when** activation succeeds, **then** Version `1.0` is created immediately, capturing everything just submitted.
- **Given** an active category is edited, only its Basic Details step changed, and the admin leaves the wizard, **when** the session ends, **then** exactly one minor version is recorded.
- **Given** an active category is edited, its Expense Form, Policies & Approvals, and Project Based Policies all changed, and the admin leaves the wizard, **when** the session ends, **then** exactly one major version is recorded, and the minor counter resets to `0`.
- **Given** an active category's wizard is opened and closed again with zero actual changes made, **when** the session ends, **then** no new version is created.
- **Given** several individual step-saves happen within one edit session (e.g. Step 2 saved, then Step 3 saved, then the wizard is closed), **when** the session ends, **then** only one version is recorded for the whole session, not one per step-save.

### Error / Toast Messages

Not applicable — version creation is an automatic side effect of saving/leaving the wizard, not a user-initiated action with its own confirmation or failure messaging beyond whatever the underlying step-save already reports.

---

## Story: Category Details Page (read-only, version-aware)

**As a** Company Administrator
**I want to** view a category's full configuration, for any version, without risk of accidentally changing it
**So that** I can review history safely, separately from editing

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| Category Details | Breadcrumb: "Categories Management / Version {X.Y}" | — | Top-left |
| Category Details | Version dropdown | select | Top-right; lists every recorded version (or "Draft" if the category has none yet), switching which snapshot the page displays |
| Category Details | Step navigation (left rail, fixed position) | nav | Basic Details / Expense Form Builder / Policies & Approvals / Project Based Policies & Approvals — scroll-jumps the body to that section, same `StepNav` scroll-spy pattern [008](./008-employee-invitation.md)'s Invite Employee page already established |
| Category Details | "Modified" badge (per step in the left rail) | badge | Shown next to a step's nav item only if that step's data differs between the currently-viewed version and the one immediately before it |
| Category Details | Body sections (one per step) | read-only display | Collapsible sub-rows (e.g. each field, each policy) — plain labels/values, no inputs, no Save action anywhere on this page |

### Flow

1. Reached two ways: clicking a category's card body on [014](./014-category-listing.md)'s listing (opens the **latest** version by default), or clicking "View Details" on a specific version in the drawer above (opens that **exact** version).
2. The left rail lists all 4 steps; clicking one scroll-jumps the body to that section, and the currently-in-view section highlights as the admin scrolls — purely a navigation aid, identical in spirit to [008](./008-employee-invitation.md)'s `StepNav`, not a form-completion indicator (there's nothing to complete here).
3. The body renders every step's data as **plain, read-only text** — e.g. Step 1's Category Name/Description/Map Ziptrrip Category shown as label/value pairs, Step 2's fields listed as collapsible rows (collapsed by default, expandable to see that field's full configuration), Step 3/4's policies the same way. A step with nothing configured for the version being viewed (e.g. Project Based Policies on a version that had `enableProjectPolicies: false`) shows an explicit "No project-based policies configured for this version" message rather than an empty section.
4. **Switching the Version dropdown reloads the entire body** with that version's stored snapshot, updates the breadcrumb, and recomputes which steps show a "Modified" badge (relative to *that* version's own previous version, not the one the admin was just looking at).
5. This page has no Save, no Cancel, no destructive actions of any kind — it's purely a viewer. The only way to change a category's actual configuration remains [015](./015-category-edit-and-duplicate.md)'s Edit flow, reached from the listing, not from here.
6. Viewing a **draft** category's "Draft" entry (from the drawer) opens this same page shape, but showing the live, currently-saved-but-unversioned state, with no version dropdown to switch away from (there's nothing else to switch to yet) and no "Modified" badges (there's no prior version to diff against).

### Acceptance Criteria

- **Given** a category's card is clicked on the listing, **when** the page loads, **then** it shows that category's latest version by default.
- **Given** a specific version's "View Details" is clicked from the drawer, **when** the page loads, **then** it shows exactly that version, not the latest.
- **Given** the Version dropdown is changed, **when** a different version is selected, **then** the entire body updates to that version's snapshot, and the "Modified" badges recompute for the newly-selected version.
- **Given** a version where only Basic Details changed from its predecessor, **when** viewed, **then** only Basic Details shows a "Modified" badge in the left rail.
- **Given** any field or button on this page, **when** inspected, **then** nothing is editable and no save/submit action exists anywhere on it.
- **Given** a draft category's "Draft" entry is opened, **when** the page loads, **then** it shows the live current state, no version dropdown, and no Modified badges.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Failed to load a version's details | "Something went wrong. Please try again." |
| A requested version no longer exists (shouldn't normally happen, since versions are immutable and never deleted) | "This version could not be found." |

---

## API Design

| Method | Path | Body / Query | Response (success) |
|--------|------|---------------|---------------------|
| GET | `/api/categories/:id/versions` | — | `{ versions: [{ version: "12.1", isMajor: false, createdAt, createdBy: { name, email } }] }` (or `{ isDraft: true }` shape for a still-draft category, since it has no real version list) — newest first |
| GET | `/api/categories/:id/versions/:version` | — | `{ category: { ...full snapshot as of that version... }, modifiedSteps: ["basicDetails"] }` — powers the Category Details page for a specific version |
| GET | `/api/categories/:id/versions/latest` | — | Same shape as above, for the "click the card" entry point |

No write endpoints in this story — version creation is a side effect of [013](./013-category-creation.md)'s activation call and [015](./015-category-edit-and-duplicate.md)'s per-step save endpoints (specifically, whichever save call is followed by the admin leaving the wizard, per the versioning scheme above), not a directly-invoked action of its own. Error responses follow the existing convention: 401/403/404/500 as elsewhere in this epic.

## Data Model

New table:

- **`CategoryVersion`**: `id`, `categoryId`, `version` (string, e.g. `"12.1"`, or store `majorVersion`/`minorVersion` as separate integers and compose the display string — cleaner for comparison/sorting), `isMajor` (boolean, redundant with `minorVersion === 0` but convenient to query directly), `snapshot` (JSON — the complete category configuration at this version: basic details, all fields, all policies, project policies), `modifiedSteps` (a small JSON array or bitmask recording which of the 4 steps differed from the previous version — computed once at creation time, not recomputed on every read), `createdBy` (FK → `employees`), `createdAt`.

No changes to `Category`/`CategoryField`/`CategoryPolicy`/etc. themselves — those tables continue to hold the category's *current* live state (what [013](./013-category-creation.md)/[015](./015-category-edit-and-duplicate.md) read and write); `CategoryVersion.snapshot` is a separate, frozen copy taken at each version-creation moment, deliberately duplicating data rather than trying to reconstruct historical state from a diff chain.

## Validation Rules Summary

| Field | Rule |
|-------|------|
| Version number | `major.minor`, starts at `1.0`, minor increments or major increments-and-resets-minor per the threshold rule above |
| Snapshot | Immutable once created |
| Category Details page | Fully read-only; no validation rules apply since nothing is submitted from it |

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| CV-01 | Activate a brand-new category | Version `1.0` is created immediately with a full snapshot |
| CV-02 | Open Version History for a still-draft category | Shows one "Draft" entry, no numbered versions |
| CV-03 | Open Version History for an active category with several versions | Shows all of them, newest first, major ones visually distinguished |
| CV-04 | Edit only Step 1 of an active category, leave the wizard | One minor version recorded |
| CV-05 | Edit Steps 2, 3, and 4 of an active category, leave the wizard | One major version recorded, minor resets to 0 |
| CV-06 | Open the wizard for an active category and leave without changing anything | No new version created |
| CV-07 | Save Step 2, then Step 3, within the same edit session, then leave | Exactly one version recorded for the session, not two |
| CV-08 | Click a listing card directly | Category Details opens showing the latest version |
| CV-09 | Click "View Details" on an older version in the drawer | Category Details opens showing exactly that version |
| CV-10 | Switch the Version dropdown on the Category Details page | Body reloads with the newly-selected version's data; Modified badges recompute |
| CV-11 | View a version where Project Based Policies were disabled | That section shows "No project-based policies configured for this version" |
| CV-12 | Attempt to find any editable control on the Category Details page | None exists |
| CV-13 | Non-owner employee requests version history or details | 403 |

## Edge Cases

| Scenario | Expected Result |
|----------|------------------|
| A category is edited by two different admins in overlapping sessions | Whichever session's "leave the wizard" fires last computes the diff against the (by-then-already-updated) previous version and records its own version — same last-write-wins posture as [013](./013-category-creation.md)/[015](./015-category-edit-and-duplicate.md)'s other concurrent-edit handling |
| An edit session changes a step's data and then changes it back to the original value before leaving | That step no longer differs from the previous version by the time the session ends, so it doesn't count toward the modified-step total (potentially resulting in "0 changed" and no new version, even though saves happened along the way) |
| Requesting `GET /api/categories/:id/versions/:version` for a version number that was never actually created for this category | 404, "This version could not be found." |
| A category with exactly one version (`1.0`, freshly activated, never edited since) | Version History shows just that one entry; the Category Details page shows no "Modified" badges anywhere, since there's no prior version to diff against |

## Out of Scope

- Restoring/reverting a category to a previous version's configuration — this story is view-only; making an old version live again would need its own explicit story.
- Comparing two arbitrary versions side-by-side (a diff view) — the "Modified" badge only indicates *that* a step changed versus the immediately preceding version, not *what* changed within it.
- Deleting individual versions from history.
- Exporting version history/snapshots.

## Open Questions / Assumptions

- **The single most significant design decision in this story — exactly when an edit session "ends" and triggers version creation** — is not explicitly specified anywhere in the source request (which only says a version is created "when category status is not draft and category update"). This doc resolves it as: **version creation is triggered when the admin leaves the Edit wizard** (Cancel, navigating away, or closing it) for an already-active category, at which point the system diffs current state against the previous version across all 4 steps. This was chosen because per-step-save-triggered versioning is structurally incompatible with the confirmed major/minor rule ("3+ of 4 steps changed" can never be true from a single step's own save endpoint, since each endpoint only ever touches one step). **This is a real architectural decision, not a minor assumption, and is worth explicit confirmation before implementation** — an alternative (e.g. a dedicated "Finish Editing" button spanning the whole wizard, instead of inferring session-end from navigation) would change both the UI and the backend trigger mechanism.
- **New categories start version numbering at `1.0`** — the reference screenshots' sample data (versions like `10.1`–`12.1`) reflects pre-existing seed/demo data, not a specified starting point for new categories.
- **"Created By" on a version** is whichever admin's session produced it — assumed to be `req.userId` at the moment the session-end diff/save fires, same as every other `createdBy`/`updatedBy` convention already used across this codebase.
