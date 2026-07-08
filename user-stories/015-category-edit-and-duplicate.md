# 015 - Category Edit and Duplicate

**Status:** Draft
**Epic:** Category Management

## Overview

Covers the two remaining ways into [013-category-creation.md](./013-category-creation.md)'s 4-step wizard beyond creating a brand-new category from scratch: **Edit** (the pencil icon on [014](./014-category-listing.md)'s listing card — reopen this exact category's own data and change it in place) and **Duplicate** (the copy icon — open the same wizard pre-filled with everything *except* the name, to create a **new**, independent category from an existing one as a starting point). Both reuse every screen, field, and validation rule [013](./013-category-creation.md) already defines; this story only covers what's different about *entering* the wizard and *what happens on submit* for each.

---

## Story: Edit Category

**As a** Company Administrator
**I want to** reopen an existing category and change its configuration
**So that** I can fix mistakes or adjust rules without recreating the whole thing

### Screens & Fields

Identical to [013](./013-category-creation.md)'s 4 steps, with two differences:

| Difference | Detail |
|------------|--------|
| Pre-filled | Every field across all 4 steps loads from the category's current saved state (via [013](./013-category-creation.md)'s shared `GET /api/categories/:id` detail endpoint) instead of starting blank. |
| "Save as Draft" visibility | Shown on every step **only if this category's `status` is still `"draft"`** — an already-`active` category never shows Save as Draft anywhere in the wizard, per [013](./013-category-creation.md)'s own Shared Behavior (there's no way to revert an active category back to draft). |

### Flow

1. Clicking the Edit (pencil) icon on any category card — draft or active — navigates to Step 1 of the wizard for that specific category, fully pre-filled.
2. **Editing a draft category** behaves exactly like continuing to create it: each step's own save endpoint updates that step's data in place, Save as Draft is available throughout, and reaching Step 4's Submit (or having already reached it in an earlier session) is what eventually flips it to `"active"` — nothing about editing a draft is different from the original create flow, since it never left draft.
3. **Editing an already-`active` category** uses the exact same per-step save endpoints ([013](./013-category-creation.md)'s `PATCH .../fields` / `PUT .../policies` / `PUT .../project-policies`, etc.) — there's no separate "edit mode" API. The difference is entirely in what happens *after* a successful save: **editing an active category creates a new version** (see [016-category-version-history.md](./016-category-version-history.md) for the full versioning scheme — briefly, a "major" bump if the edit touched 3 or more of the 4 steps' data, a "minor" bump if it touched only 1 or 2). Each step still saves and validates independently; the version bump is computed and recorded once the admin finishes editing (see [016](./016-category-version-history.md) for exactly when that happens — this story doesn't re-specify it).
4. There's no separate "Submit"/"Publish" step for an edit to an already-`active` category — since it's already active, each step's own save is the only action needed; the wizard's Step 4 still shows "Submit" as its label (matching [013](./013-category-creation.md)), but for an already-active category this call updates Project Policies in place rather than performing the original draft-to-active transition.
5. Cancel returns to the listing without further changes, same as during creation — any step already saved during this edit session stays saved (each step persists independently, per [013](./013-category-creation.md)'s one-endpoint-per-step design); Cancel only discards whatever's unsaved on the step currently open.

### Validation Rules

Identical to [013](./013-category-creation.md)'s per-step validation rules — editing doesn't relax or add to any of them. The one addition: **Category Name uniqueness (Step 1) excludes this category's own current name** — renaming "Domestic Flight" to itself (i.e., not actually changing it) isn't a duplicate-name conflict against itself, matching how [009](./009-employee-listing.md)'s Edit action excludes the row being edited from its own uniqueness checks.

### Acceptance Criteria

- **Given** a draft category, **when** its Edit icon is clicked, **then** Step 1 opens pre-filled, and Save as Draft is visible on every step.
- **Given** an active category, **when** its Edit icon is clicked, **then** Step 1 opens pre-filled, and Save as Draft is **not** visible on any step.
- **Given** an active category's Step 2 (Expense Form) is changed and saved, **when** the edit session is finished, **then** a new version is recorded (see [016](./016-category-version-history.md) for the major/minor determination).
- **Given** a category is renamed to a name already used by a *different* category in the same organization, **when** saved, **then** it's rejected with the same duplicate-name error [013](./013-category-creation.md) defines.
- **Given** a category is saved with its name unchanged, **when** saved, **then** no duplicate-name conflict is raised against itself.

### Error / Toast Messages

Identical to [013](./013-category-creation.md)'s, per step. No new messages are introduced by editing itself.

---

## Story: Duplicate Category

**As a** Company Administrator
**I want to** start a new category from an existing one's configuration
**So that** I don't have to rebuild a near-identical form/policy set from scratch

### Screens & Fields

Identical to [013](./013-category-creation.md)'s 4-step **create** wizard (not edit — duplicating always produces a brand-new category, so there's no `status: "active"`-vs-`"draft"` distinction to make; the new category always starts as `"draft"`, same as any fresh creation), with one difference:

| Difference | Detail |
|------------|--------|
| Pre-filled, except Category Name | Every field across all 4 steps loads from the source category's current saved state — **except Category Name, which starts blank** and must be filled in before Step 1 can be completed, exactly as if creating from scratch. |

### Flow

1. Clicking the Duplicate (copy) icon on any category card — draft or active — opens Step 1 of the wizard with Description, Map Ziptrrip Category, and every later step's data (fields, claim/exception/project policies) copied from the source category, but Category Name left empty.
2. The admin must type a new, non-empty, organization-unique name before Save & Continue or Save as Draft on Step 1 will succeed — the exact same Step 1 validation [013](./013-category-creation.md) already defines, just starting from a blank name field instead of a pre-filled one.
3. **The first successful save (Step 1) creates a genuinely new, independent `Category` row** with its own id — not a reference back to the source category. From that point on, this is an entirely ordinary category: editing it, versioning it, deleting it (while still draft), and enabling/disabling it all behave exactly as they would for any other category, with zero ongoing relationship to the one it was duplicated from.
4. **The duplicate starts fresh — no version history carries over.** Even if the source category was `active` with several versions already recorded, the new category begins at `status: "draft"` with none of that history; its own version numbering (once it's activated and later edited, per [016](./016-category-version-history.md)) starts from that story's own "first version" baseline, unrelated to the source's version numbers.
5. From Step 2 onward, Duplicate behaves identically to a normal create flow with pre-filled data — the admin can change anything before finishing, or leave it all as copied.

### Validation Rules

Identical to [013](./013-category-creation.md)'s create-flow validation rules. Category Name is required and must be unique — same rule as always, just starting unmet (blank) instead of already-satisfied.

### Acceptance Criteria

- **Given** any category (draft or active), **when** its Duplicate icon is clicked, **then** Step 1 opens with Description and Map Ziptrrip Category pre-filled, Category Name blank, and it's not possible to proceed without entering a name.
- **Given** a name is entered and Step 1 is saved, **when** the save succeeds, **then** a new category is created with its own id, `status: "draft"`, and copies of every later step's configuration from the source.
- **Given** the duplicate is later fully configured and activated, **when** its Version History is viewed, **then** it shows only its own versions — nothing from the source category it was duplicated from.
- **Given** the source category is later edited or deleted (while still draft), **when** that happens, **then** the already-created duplicate is completely unaffected (no live link between the two).

### Error / Toast Messages

Identical to [013](./013-category-creation.md)'s Step 1 messages (blank name, duplicate name, etc.). No new messages beyond those.

---

## API Design

No new endpoints beyond [013](./013-category-creation.md)'s. Edit reuses every one of that story's per-step endpoints unchanged (`GET/PATCH /api/categories/:id`, `PUT .../fields`, `PUT .../policies`, `PUT .../project-policies`). Duplicate is implemented entirely on the frontend as a pre-fill step: the wizard is opened with the source category's `GET /api/categories/:id` response loaded into local state (minus the name), and the very first `POST /api/categories` call — the same one that creates any brand-new category — is what actually persists it, with no dedicated "duplicate" endpoint needed.

## Data Model

No changes. Both flows read and write the exact same `Category`/`CategoryField`/`CategoryPolicy`/etc. tables [013](./013-category-creation.md) defines; Duplicate simply inserts a fresh, unrelated set of rows rather than referencing the source's.

## Validation Rules Summary

| Field | Rule |
|-------|------|
| Category Name (Edit) | Same uniqueness rule as create, excluding this category's own current name. |
| Category Name (Duplicate) | Same uniqueness rule as create; starts blank, must be filled and unique like any new category. |
| Every other field, both flows | Identical to [013](./013-category-creation.md)'s per-step rules — no relaxation or addition. |

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| CE-01 | Edit a draft category | Wizard opens pre-filled, Save as Draft visible on every step |
| CE-02 | Edit an active category | Wizard opens pre-filled, Save as Draft not shown on any step |
| CE-03 | Edit an active category's Expense Form and save | A new version is recorded once the edit session finishes |
| CE-04 | Rename a category to an already-used name (different category) | Rejected |
| CE-05 | Save an edited category with its name unchanged | Not treated as a duplicate-name conflict |
| CE-06 | Duplicate a category, leave Category Name blank, try to save | Blocked — Category Name is required |
| CE-07 | Duplicate a category, enter a valid new name, save | A new, independent category is created with copied Step 2–4 data |
| CE-08 | Duplicate an active category with 5 recorded versions, then activate the duplicate and check its Version History | Shows only the duplicate's own versions, none from the source |
| CE-09 | Delete the source category (while still draft) after duplicating it | The already-created duplicate is unaffected |
| CE-10 | Non-owner employee attempts to edit or duplicate any category | 403, same as [013](./013-category-creation.md)'s owner-only gate |

## Edge Cases

| Scenario | Expected Result |
|----------|------------------|
| Two admins edit the same active category concurrently | Last write wins per step, same level of rigor as every other multi-admin write path in this codebase (see [013](./013-category-creation.md)'s own Edge Cases) |
| Duplicating a category whose source Claim Policy approvers reference an employee who's since been suspended/deactivated | The duplicate copies the approver reference as-is; whether a suspended employee can still act as an approver is a runtime/claim-processing concern, out of scope here same as it is in [013](./013-category-creation.md) |
| Duplicating a category, then abandoning Step 1 without ever saving a name | No category is created — Step 1's own `POST /api/categories` never fired, so there's nothing to clean up |
| Editing a category and simultaneously duplicating it in a second browser tab | Two independent flows — the duplicate reads the source's state once, at the moment its wizard opened; it doesn't pick up changes made to the source afterward in the other tab |

## Out of Scope

- Bulk duplicate (duplicating several categories at once).
- Any UI affordance suggesting a duplicated category stays "linked" to its source (e.g. "created from X") — this story treats them as completely independent from the moment of creation.
- Restoring/reverting a category to a previous version — that's [016](./016-category-version-history.md)'s concern, and even there is only a "view," not a "restore," per that story.

## Open Questions / Assumptions

- **Exactly when a version is recorded during an edit session** (immediately per step-save, or once when the admin navigates away/finishes) is deferred to [016-category-version-history.md](./016-category-version-history.md) — this story only establishes *that* editing an active category produces a new version, not the precise trigger moment.
