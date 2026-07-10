# 022 - Claim Creation: Entry Point & Manual Claim

**Status:** Draft
**Epic:** Claim Management

## Overview

Covers the "Create Claim" entry point (the fork between two claim-creation modes) and the **Manual Add Claim** flow in full. `023-claim-creation-ai-powered.md` covers the other mode (AI-Powered/Automated Extraction) and reuses this doc's entry point, Claim Type (new vs. linked-to-trip), and Split behavior rather than re-specifying them. `024-my-claim-listing.md` covers the "My Claim" listing screen both flows land on afterward — the same "creation now, listing separately" split this codebase already used for Category Management (`013`/`014`) and Trip Management (`018`/`019`).

**A Claim's expense form is not fixed — it's whatever the selected Category's own Step 2 field configuration says it should be.** This is the single most important mechanic in this epic: once an employee picks a Category for an expense line, the form that renders is built entirely from that category's `CategoryField[]` (`013-category-creation.md`'s own field-builder output) — a "Meals" category showing Vendor Name/GST Number looks nothing like a "Domestic Hotels" category showing Hotel Name/Check-In/Check-Out/Number of Nights, because those are two different admins' field configurations, not two hardcoded claim-form layouts. Claims consume Category Management; they don't duplicate it.

**Two design decisions resolved after review, plus one still purely display-only**:

1. **Duplicate detection's match key is Expense Date + Invoice/Bill Number + Amount** (confirmed — not Vendor). This turns out to need only **one** new field marker, not two: `013`'s `CategoryField` already has `useAsExpenseDate` and `useAsClaimAmount` as explicit per-field flags (exactly one of each required per category, already enforced) — Date and Amount are covered for free. The only gap is **Invoice/Bill Number**, which nothing marks today, and which isn't named consistently across categories (a Meals category might call it "Invoice ID," a different category might not have an equivalent field at all). This story adds **one** new flag, `useAsInvoiceNumber`, mirroring `useAsClaimAmount`/`useAsExpenseDate`'s pattern but **optional** rather than required — not every category necessarily has an invoice-number concept (e.g. a mileage or per-diem category might not), so unlike Amount/Date, zero or one field may carry this flag, never enforced to be exactly one. **This is a real, if small, amendment to an already-shipped, already-merged feature (Category Management, PR #27)** — a migration adding one nullable-default-false boolean column, no backfill needed, no change to any existing category's behavior. A duplicate found across two expenses is **highlighted, not blocked** — confirmed.
2. **Category's `city_list` field type now draws from Trip Management's real `Country`/`City` catalog** (48 countries, ~200 cities) instead of the small hardcoded 10-city list (`CATEGORY_CITY_LIST`) it used before — resolved, not just flagged. See [Field Type Rendering](#field-type-rendering) for exactly what this changes and what it doesn't.
3. **Claim statuses beyond `"draft"` and a generic submitted state are out of scope, matching your own answer that approval-routing is a separate future story** — so, mirroring `018`'s own `Trip.status` precedent exactly, this doc's `Claim.status` column supports the fuller set observed in the reference screenshots (`draft`, `pending_for_approval`, `ready_for_submission`, `approved_for_reimbursement`) for **display purposes only** — this epic's own code only ever writes `"draft"` or a single generic `"submitted"` value; nothing here decides what "Ready for Submission" vs. "Pending for Approval" actually means or what moves a claim between them.

---

## Story: Choose How to Create a Claim

**As a** logged-in employee
**I want to** pick between AI-assisted and manual expense entry
**So that** I can use whichever fits how many/what kind of bills I have

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| Create Claim | Page title "Create Claim" | heading | — |
| Create Claim | "Automated Extraction" card | card → `023`'s AI-Powered flow | Green dashed border, "AI Powered" badge, "Proceed" button |
| Create Claim | "Enter your expense details manually" card | card → this doc's Manual flow | "Add Expense +" button |
| Create Claim | Note box | informational | "Each image you upload becomes one bill. For PDFs, every page is treated as a separate bill." / "If your bill has multiple pages, merge them into a single PDF before uploading." — applies to the AI flow's upload step, shown here as an upfront expectation-setter |
| Create Claim | "What happens next?" box | informational | Explains the draft → submit → approval lifecycle in plain language (matching the reference screenshot's own copy) |

### Flow

1. Reached via "Create Claim" on `024`'s My Claim listing.
2. Clicking "Proceed" on the Automated Extraction card goes to `023`'s Step 1. Clicking "Add Expense +" on the manual card goes to this doc's Manual Add Claim screen.
3. Neither card requires anything to be filled in on this screen itself — it's a pure fork, no shared fields live here.

### Validation Rules

Not applicable — no fields.

### Acceptance Criteria

- **Given** the Create Claim screen, **when** "Proceed" is clicked, **then** the AI-Powered flow (`023`) starts.
- **Given** the Create Claim screen, **when** "Add Expense +" is clicked, **then** the Manual flow (below) starts.

### Error / Toast Messages

Not applicable.

---

## Story: Manually Add a Claim

**As a** logged-in employee
**I want to** enter my expense details by hand, one or more at a time
**So that** I can log a claim without needing to photograph/upload every bill

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Add Manually | "Add Expense" / "Split Claim" buttons | buttons, top-right | — |
| Add Manually | Claim Type | radio: "Create New Claim" / "Link to Trip" | Yes |
| Add Manually (Create New Claim selected) | Claim Name | text | Yes |
| Add Manually (Link to Trip selected) | Trip Name | searchable single-select dropdown, filterable by Start Date | Yes |
| Add Manually | Expense panel (repeated, up to 10) | collapsible card, drag handle to reorder | — |
| Expense panel | Category | searchable single-select dropdown, active categories only | Yes |
| Expense panel | *(every field the selected Category's Step 2 configuration defines)* | dynamic, per-`CategoryField` | Per each field's own `isRequired` |
| Expense panel | Paid By | radio: "Company Paid" / "Self Paid" | Yes |
| Expense panel | "Split Expense" button | button → see [Split an Expense](#story-split-an-expense) | — |
| Add Manually | "Back" / "Cancel" / "Save as Draft" / "Save Claim" | buttons, bottom | — |

### Flow

1. **Claim Type** starts on "Create New Claim." Choosing **"Link to Trip"** replaces the Claim Name field with a Trip Name dropdown — **only trips with `status: "new"` appear** (matching your own instruction), searchable by name, with a "Filter by Start Date" control. Selecting a trip means this claim's expenses are attributed to that trip; the claim itself still has no separate "name" field once linked — the trip's own name/reference is the claim's identity (see [Open Questions](#open-questions--assumptions) on whether a Claim Name should still be collectable even when trip-linked).
2. **Claim Name** (Create New Claim mode only): required, matching this codebase's other name-field conventions (2–100 characters).
3. On first entry, one "Expense 01" panel is already present, matching Category Creation's own "start with one, always present" pattern (`013`'s Claim Policy default). **"Add Expense" adds another, up to a maximum of 10** — the button disables once the cap is reached.
4. **Category** lists only categories where `status: "active"` **and** `isEnabled: true` — a draft or disabled category never appears here, since neither is meant to be claimable (`014-category-listing.md`'s own Enable/Disable story establishes exactly this "not usable" meaning for a disabled category).
5. **Selecting a Category dynamically renders that category's entire Step 2 field configuration** as this expense's form, in the same order the fields were configured in, respecting each field's own `conditionalVisibility` (a field only shows if its dependency's current value matches). See [Field Type Rendering](#field-type-rendering) below for exactly how each of the 14 `CategoryFieldType`s renders and behaves on this form.
6. **Paid By** — every expense requires this regardless of category; it isn't part of a category's own field configuration, it's a claim-level concept applied per expense.
7. **Save as Draft** persists the claim and every expense exactly as currently filled in, with the lenient, no-advance-validation posture Category Creation's own Steps 1–2 use — a half-filled expense is a valid draft. **Only a Draft claim can be edited later** (your own instruction) — once a claim leaves Draft (via Save Claim), it's read-only from this screen's perspective; further changes are a future story's concern (matching `018`'s "Trip is editable only while `new`" precedent, applied here to Claims).
8. **Save Claim** validates every expense's every required field (per that field's own `isRequired`/type-specific rules — the same validation `013`'s Step 2 already defines, applied per-submission instead of per-category-configuration), checks for duplicate bills (see [Open Questions](#open-questions--assumptions) on the Vendor/Invoice Number gap), and persists the claim with a submitted status. What happens after that (routing to an approver) is a future story's concern — see [Overview](#overview).
9. **Back** and **Cancel** both return to `024`'s listing without persisting unsaved changes — "Back" implies returning to the Create Claim entry screen conceptually, but functionally both discard identically in this story (no separate wizard-step state to preserve).

### Field Type Rendering

| `CategoryFieldType` | Renders as | Notes |
|----------------------|------------|-------|
| `invoice` / `file_upload` | File dropzone | Enforces the category's own `allowedFileTypes`/`maxFileSizeMb`/`maxFileCount` from that field's `config` |
| `amount` / `number` | Numeric input | **If the field's `config.formula` is set, this field is read-only/computed** — recalculated live from whichever other fields the formula references (matches the reference screenshot's greyed-out "Number of Nights"/"Per Night Rate" on a Domestic Hotels expense) |
| `small_text` | Text input | Enforces `minLength`/`maxLength`/`allowSpecialCharacters`/`allowNumbers`/`regex` from `config` |
| `large_text` | Textarea | Enforces `minLength`/`maxLength` |
| `list` | Single-select dropdown | Options sourced from `config.valuesListKey` (Airlines/Based Locations today, per `013`) |
| `city_list` | Searchable single- or multi-select dropdown, server-backed | Reuses Trip Management's own `CitySelect` component and `GET /api/cities` search (`018`) instead of a static 10-item list — the field stores real `City` id(s), not city-name strings. `config.allowMultiSelect`/`minRequiredSelection`/`maxRequiredSelection` keep working exactly as configured, just against ~200 real cities instead of 10 hardcoded names. This is a genuine behavior change for every category with an existing `city_list` field, not just new ones — see [Data Model](#data-model) for the migration this implies. |
| `dropdown` / `radio_button` | Select / radio group | Options from `config.options`, admin-defined per field |
| `date` / `date_time` / `time` / `duration` | Native picker | — |

The field marked `config.useAsClaimAmount: true` is this expense's Amount (used for the claim/trip's running total); the field marked `config.useAsExpenseDate: true` is this expense's date (used for date-based filtering elsewhere). Both are guaranteed to exist exactly once per category, per `013`'s own form-level validation.

### Validation Rules

| Field | Rule |
|-------|------|
| Claim Name (Create New Claim mode) | Required, 2–100 characters |
| Trip Name (Link to Trip mode) | Required, must be a trip with `status: "new"` owned by the caller |
| Category (per expense) | Required, must be an active, enabled category |
| Every category-defined field | Per that field's own `isRequired`/type-specific rule, exactly as `013` already validates them at category-configuration time — re-validated here at submission time against submitted values |
| Paid By (per expense) | Required |
| Expense count | 1–10 per claim |

### Acceptance Criteria

- **Given** "Link to Trip" is selected, **when** the Trip Name dropdown opens, **then** only the caller's own `status: "new"` trips appear.
- **Given** a Category is selected for an expense, **when** the panel re-renders, **then** it shows exactly that category's configured fields, in configured order, respecting conditional visibility.
- **Given** a field with a formula (e.g. "Per Night Rate"), **when** its referenced fields change, **then** it recalculates and stays read-only.
- **Given** 10 expenses already exist on a claim, **when** the admin looks at "Add Expense," **then** it's disabled.
- **Given** a claim with incomplete required fields, **when** "Save as Draft" is clicked, **then** it saves anyway (lenient).
- **Given** the same incomplete claim, **when** "Save Claim" is clicked, **then** it's blocked with field-level errors until every required field is filled.
- **Given** a Draft claim, **when** the employee reopens it, **then** it's editable; **given** a submitted claim, **when** the employee reopens it, **then** it is not (this story doesn't specify what the reopened, read-only view looks like — see `024`).

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Blank Claim Name | "Claim Name is required." |
| No trip selected in Link to Trip mode | "Select a trip." |
| Blank Category | "Category is required." |
| A category-defined required field left blank | Whatever `013`'s own per-field-type message already is (e.g. "Add at least two options." for a Dropdown with <2 options) — not reinvented here |
| Blank Paid By | "Select who paid for this expense." |
| Expense cap reached | "You've reached the maximum of 10 expenses." |
| Draft saved | "Claim saved as draft." |
| Claim saved | "Claim saved." |
| Duplicate bill detected | See `023`'s own Duplicate Bill Detection story — this applies to both flows |
| Server/network error | "Something went wrong. Please try again." |

---

## Story: Split an Expense

**As a** logged-in employee
**I want to** divide one bill's cost across more than one category or Paid-By value
**So that** a single receipt that actually covers multiple kinds of spend is recorded accurately

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| Expense panel | "Split Expense" button | button → opens the split view for that expense | Disabled until the expense's Category and Amount are filled in (matches the reference screenshot showing it greyed out on a blank expense) |
| Split Expense view | Resulting expense rows (2+) | — | Each keeps its own Category, its own portion of the Amount, and can differ in Paid By |

### Flow

1. Splitting one expense produces **two or more expense entries**, all still referencing the same uploaded invoice/receipt (there's still only one physical bill), but each with its own Category and its own Amount portion.
2. **The split portions' Amounts must sum to the original expense's Amount** — this is the core rule that keeps a split expense honest; the UI should make the remaining/unallocated amount visible as the employee splits.
3. Each resulting row is otherwise a normal expense — its own Category selection re-renders that category's own fields (a split across two entirely different categories, e.g. part-Room/part-Food on one hotel folio, is expected and valid).
4. Splitting again (splitting an already-split row further) is allowed, within the claim's overall 10-expense cap.
5. There's no "unsplit"/undo in this story — the employee can freely edit or delete any of the resulting rows individually, the same as any other expense.

### Validation Rules

| Rule | Detail |
|------|--------|
| Split portions must sum to the original Amount | Enforced before the split can be confirmed |
| At least 2 resulting rows | A "split" into 1 row isn't a split |
| Overall 10-expense claim cap still applies | Splitting can't push the claim over 10 expenses total |

### Acceptance Criteria

- **Given** an expense with Amount ₹1,000, **when** it's split into two rows of ₹600 and ₹400, **then** both are accepted (sums match).
- **Given** the same split attempted as ₹600 and ₹300, **when** confirmed, **then** it's blocked — portions don't sum to the original.
- **Given** a claim already at 10 expenses, **when** an attempt is made to split one of them, **then** it's blocked (would exceed the cap).

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Split portions don't sum to the original Amount | "Split amounts must add up to the original expense amount." |
| Splitting would exceed 10 expenses | "You've reached the maximum of 10 expenses." |

---

## Story: Split a Claim

**As a** logged-in employee
**I want to** move some of a claim's expenses into a brand-new, separate claim
**So that** expenses that don't belong together (different trip, different approver) aren't stuck in one claim

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| Add Manually | "Split Claim" button | button, top-right | Opens a picker to choose which expenses move out |
| Split Claim picker | Expense checklist | multi-select | Every expense currently on this claim |
| Split Claim picker | New claim's Claim Name (or Trip link) | Same Claim Type choice as the original claim's own creation | — |

### Flow

1. Clicking "Split Claim" opens a checklist of this claim's current expenses; the employee selects which ones move to a new claim.
2. Confirming creates a **brand-new, independent Claim** with the selected expenses moved onto it (not copied — they no longer belong to the original claim), and asks for that new claim's own Claim Name or Trip link, the same Claim Type choice every claim starts with.
3. The original claim keeps whatever expenses weren't selected. **Splitting all the way down to zero expenses on the original isn't allowed** — at least one must remain (mirroring the "a claim/policy card always has at least one" floor already used elsewhere in this codebase).
4. Both claims are fully independent from this point on — editing, submitting, or deleting one never affects the other, the same "no live link between the two" posture Category Management's own Duplicate action established (`015-category-edit-and-duplicate.md`).
5. Splitting is only available while the original claim is still `"draft"` — matching this whole epic's "only a Draft claim can be edited" rule, since a claim that's already left Draft isn't editable to begin with.

### Validation Rules

| Rule | Detail |
|------|--------|
| At least 1 expense must move | Selecting zero and confirming does nothing |
| At least 1 expense must remain on the original | Can't select all of them |
| Only available on a Draft claim | Enforced server-side, not just hidden client-side |

### Acceptance Criteria

- **Given** a Draft claim with 4 expenses, **when** 2 are selected and Split Claim is confirmed, **then** a new claim is created with those 2, and the original keeps the other 2.
- **Given** an attempt to select all 4 expenses, **when** confirmed, **then** it's blocked — at least one must remain.
- **Given** a non-Draft claim, **when** Split Claim is attempted (bypassing the UI), **then** it's rejected server-side.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Zero expenses selected | "Select at least one expense to move." |
| All expenses selected | "At least one expense must remain on this claim." |
| Claim isn't a draft | "Only draft claims can be split." |
| Split succeeded | "Claim split successfully." |

---

## API Design

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| POST | `/api/claims` | `{ claimType: "standalone" \| "trip_linked", name?, tripId?, isDraftSave }` | `{ id, status }` |
| GET | `/api/claims/:id` | — | Full claim + its expenses, shaped for this screen to re-render |
| PATCH | `/api/claims/:id` | Same shape as create | `{ message }` — 409 if not `"draft"` |
| PUT | `/api/claims/:id/expenses` | `{ expenses: [...] }` (full replace, same replace-by-id vs. destroy-then-recreate judgment call `013` already made for `CategoryField` vs. `CategoryPolicy` — resolve per whether anything ever references an expense by id) | `{ message }` |
| POST | `/api/claims/:id/expenses/:expenseId/split` | `{ portions: [{ categoryId, amount, ... }] }` | `{ expenses: [...] }` |
| POST | `/api/claims/:id/split` | `{ expenseIds: [...], newClaim: { claimType, name?, tripId? } }` | `{ originalClaimId, newClaimId }` |
| GET | `/api/categories/claimable` | — | Active + enabled categories only, for the Category dropdown — a narrower sibling of `013`'s own listing endpoint, not a new resource |

Error responses follow the existing convention (`{ error: string }`): 400/401/404/409/500 as elsewhere in this codebase. No `403`/owner-gate — same posture as Trip Management, since a claim is a personal record.

## Data Model

New tables:

- **`Claim`**: `id`, `organizationId`, `employeeId`, `name` (nullable — only set for standalone claims, see Open Questions), `claimType` (`"standalone" | "trip_linked"`), `tripId` (FK → `Trip`, nullable), `creationMethod` (`"manual" | "ai"` — informational only, doesn't change behavior after creation), `status` (string — this epic only ever writes `"draft"` or one generic submitted value; see [Overview](#overview) on the fuller display-only value set), `totalAmount` (decimal, derived from its expenses' Amounts), `createdAt`/`updatedAt`.
- **`Expense`**: `id`, `claimId` (FK), `categoryId` (FK → `Category`), `position`, `paidBy` (`"company" | "self"`), `fieldValues` (JSONB — a per-`CategoryField`-id map of submitted values), `amount` (decimal, denormalized from the field marked `useAsClaimAmount`), `expenseDate` (date, denormalized from the field marked `useAsExpenseDate`), `invoiceNumber` (string, nullable, denormalized from whichever field is marked `useAsInvoiceNumber` — the third leg of the duplicate-detection key, alongside `expenseDate` and `amount`, both already available as their own columns), `splitFromExpenseId` (FK → `Expense`, nullable — tracks a Split Expense's lineage back to its original), `createdAt`/`updatedAt`. An index on `(organizationId, invoiceNumber, expenseDate, amount)` (via a join to `Claim` for `organizationId`, or denormalized onto `Expense` directly for a simpler index — implementation's call) backs the organization-wide duplicate check without a full-table scan.

**Amendment to `CategoryField` (013)**: add one new boolean column, `useAsInvoiceNumber`, defaulting `false`. Unlike `useAsClaimAmount`/`useAsExpenseDate` (exactly one required per category, enforced at Category Creation's own Save & Continue), marking a field this way is **optional** — a category with no invoice-number-equivalent concept simply never sets it, and duplicate detection degrades to matching on Date + Amount alone for that category (see the AI-Powered story's own Duplicate Bill Detection section). No backfill needed — every existing category's rows default to `false` on this new column and behave exactly as before.

**`city_list` migration**: no schema change to `CategoryField` itself (its `config` shape — `allowMultiSelect`/`minRequiredSelection`/`maxRequiredSelection` — stays identical), but `category-fields.controller.ts`'s own config validation (`validateFieldConfig`'s `city_list` branch, which today checks `maxRequiredSelection <= CATEGORY_CITY_LIST.length`) needs to check against the real `City` table's count instead, and every place that *renders* a `city_list` field for actual value entry (this epic's own dynamic claim form) needs to use `CitySelect`/`GET /api/cities` rather than the old hardcoded array. Any already-saved `city_list` field *value* that happens to be a bare city name string (from before this change, if any exist) doesn't map onto a real `City.id` automatically — this is a real, if narrow, backward-compatibility gap worth a specific look during implementation, not silently assumed away.

## Validation Rules Summary

See each story's own Validation Rules table above — this epic reuses `013`'s per-field-type rules verbatim rather than restating them.

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| CM-01 | Select "Link to Trip," open the Trip dropdown | Only `status: "new"` trips owned by the caller appear |
| CM-02 | Select a Category for an expense | That category's own fields render, in order, respecting conditional visibility |
| CM-03 | Fill a formula-backed field's dependencies | The formula field recalculates and stays read-only |
| CM-04 | Add expenses up to 10, then attempt an 11th | "Add Expense" is disabled |
| CM-05 | Save as Draft with required fields blank | Succeeds anyway |
| CM-06 | Save Claim with required fields blank | Blocked with field-level errors |
| CM-07 | Reopen a Draft claim | Editable |
| CM-08 | Reopen a submitted (non-draft) claim | Not editable |
| CM-09 | Split a ₹1,000 expense into ₹600 + ₹400 | Accepted |
| CM-10 | Split a ₹1,000 expense into ₹600 + ₹300 | Blocked — doesn't sum |
| CM-11 | Split Claim, selecting all expenses | Blocked — at least one must remain |
| CM-12 | Split Claim on a non-draft claim (direct API call) | Rejected, 409 |

## Edge Cases

| Scenario | Expected Result |
|----------|------------------|
| A category is disabled after an existing Draft claim already has an expense using it | The expense keeps its already-saved field values; the Category dropdown for *new* expenses no longer offers it (matches `014`'s own "disabled means not offered for new use" precedent) |
| Two employees split from the same source claim concurrently (not applicable — a claim is single-employee-owned, so this can't actually happen) | N/A, included for completeness |
| An expense is split, then the resulting rows are split again | Allowed, within the overall 10-expense claim cap |

## Out of Scope

- Everything after "Save Claim" succeeds — approval routing through the category's configured Approval Flow (`013`'s Levels/Stages/Approvers), what "Pending for Approval"/"Ready for Submission"/"Approved for Reimbursement" actually mean and what moves a claim between them — a separate future story, per your own answer.
- The AI-Powered flow itself — `023`.
- The "My Claim" listing screen, its filters, and the "Split Request" tab — `024`.
- Editing or deleting a submitted (non-draft) claim.
- Undoing a Split Expense or Split Claim once confirmed.

## Open Questions / Assumptions

- **Does a trip-linked claim still collect its own Claim Name, or does the trip's own name stand in for it entirely?** The reference screenshot shows the Claim Name field only under "Create New Claim," disappearing when "Link to Trip" is chosen — assumed intentional (the trip's name is the identity), but worth confirming, since `024`'s listing needs *something* to display per claim either way.
- **What does "reopening a submitted claim" actually show**, if not the editable form? Deferred to `024`, but flagged here since this doc's own Acceptance Criteria references it.
- **Pre-existing `city_list` field *values* that don't map onto a real `City` row** (see the migration note above) — a narrow backward-compatibility question, only relevant if any category has actually been used with a `city_list` field before this change ships.
