# 013 - Category Creation

**Status:** Draft
**Epic:** Category Management

## Overview

Covers the "Create Category" wizard under Company Settings — the screen `company-settings/categories/page.tsx` has been a bare `<ComingSoon title="..." />` placeholder (`frontend/CLAUDE.md`'s shrinking-placeholder list already flags it as the last one waiting for its own story). A category defines, for one kind of expense (e.g. "Domestic Flight," "Client Dinner"), three things together: **what data an employee fills in** when claiming that expense (a custom form, built field-by-field), **who's eligible and what rules apply** to that data (claim policies, with optional exception policies), and **who has to approve it** (multi-level, multi-approver approval chains) — optionally varying all of that per project.

This is a 4-step wizard, each step materially larger and more self-contained than any other wizard in this codebase (including [008](./008-employee-invitation.md)'s 4-step Invite Employee wizard, which this most closely resembles structurally): **Basic Details** (name/description/an external category mapping), **Expense Form** (a drag-free, click-to-build form builder over 14 field types), **Policies and Approvals** (claim + exception policies, each with eligibility/rules/multi-level approval chains), and **Project Based Policies & Approvals** (the same policy shape again, scoped to projects instead of departments/grades/employees). Per the source request: **each step after Step 1 saves itself independently via its own API call; Step 1's data (Basic Details) is fetched/updated through the one shared "category detail" endpoint every other step also reads from** — there's no separate "load basic details" call duplicated per step.

**Terminology note**: "Ziptrrip"/"ZipTrip" (the connected trip-booking product, per the header's `zippayy`/`ziptrrip` product switcher in the reference screenshots) is a different, already-integrated product this app maps expense categories onto — "Map Ziptrrip Category" in Step 1 is a static, hardcoded list (per explicit instruction), not a live integration call.

**This story was written after two rounds of clarifying questions** (the source request explicitly invited them) resolving structural gaps between the written spec and the reference screenshots — every resolution is called out inline where it applies and summarized in [Open Questions](#open-questions--assumptions).

**This story covers creating a brand-new category only.** Three closely-related stories cover everything that happens to a category afterward: [014-category-listing.md](./014-category-listing.md) (the "My Categories" grid, and the Delete/Enable-Disable lifecycle actions), [015-category-edit-and-duplicate.md](./015-category-edit-and-duplicate.md) (reopening this same 4-step wizard to edit or to duplicate an existing category), and [016-category-version-history.md](./016-category-version-history.md) (the versioning scheme this wizard's edits produce, and the read-only Category Details page). All four together make up the Category Management epic.

---

## Story: Step 1 — Basic Details

**As a** Company Administrator
**I want to** name a category, describe it, and optionally map it to a Ziptrrip category
**So that** the rest of the wizard has an identity to build on, and bills can be auto-categorized later

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Basic Details | Category Name | text | Yes |
| Basic Details | Description | textarea | Yes |
| Basic Details | Map Ziptrrip Category | multi-select checkbox dropdown, static list | No |
| Basic Details | "Save as Draft" button | button → saves current state as `status: "draft"`, returns to the Category listing (hidden once the category is `"active"` — see [Shared Behavior](#shared-behavior-across-all-4-steps)) | — |
| Basic Details | "Save & Continue" button | button → validates, saves, advances to Step 2 | — |
| Basic Details | "Cancel" button | button → discards an unsaved new category, returns to the Category listing | — |

### Flow

1. On first entry (creating a brand-new category), all fields are empty; the step indicator shows Step 1 active, Steps 2–4 not yet reachable (matching the reference screenshot's greyed-out, non-clickable numbering for future steps).
2. **Description carries an inline tip**: "Our AI learns from this text to categorize uploaded bills. Write a clear, detailed description for best auto-categorization results." — informational only, not a validation rule.
3. **Map Ziptrrip Category** opens a searchable checklist (search box + scrollable checkbox list) of a fixed, hardcoded set of Ziptrrip category names (e.g. Domestic Flight, International Flight, Domestic Hotel Dynamic, Domestic Hotel Contracted, Domestic Hotel GuestHouse, International Hotel Dynamic, Train Sleeper, Train SS, …) — zero, one, or many can be checked.
4. **Save & Continue** validates Name and Description, persists them (creating the category on first save — this is the point a numeric category id first exists, needed by every later step's own API calls), and advances to Step 2.
5. **Save as Draft** validates nothing beyond "don't crash on empty optional fields" — Category Name and Description can be saved blank if the admin explicitly chooses Draft over Continue, unlike Save & Continue which enforces both as required. A draft category is listed elsewhere (the Category listing screen, out of scope for this story) with a visible Draft status and can be reopened later to resume at whichever step it was last saved from.
6. **Cancel**, on a category that was never saved (no id yet), simply navigates back with nothing persisted. On an already-persisted draft, Cancel still just navigates back — it does not delete the draft (only an explicit delete action on the listing screen would, out of scope here).
7. Editing an **existing** category (draft or active) pre-fills all three fields from the shared category-detail endpoint (see [API Design](#api-design)).

### Validation Rules

| Field | Rule |
|-------|------|
| Category Name | Required (for Save & Continue only). 2–100 characters. Unique within the organization, case-insensitive. |
| Description | Required (for Save & Continue only). Up to 1,000 characters. |
| Map Ziptrrip Category | Optional. Zero or more selections from the fixed static list. |

### Acceptance Criteria

- **Given** a blank Category Name or Description, **when** Save & Continue is clicked, **then** the form is blocked client-side with inline "required" errors and no request is made.
- **Given** a Category Name that already exists in this organization (case-insensitive), **when** Save & Continue is clicked, **then** the request is rejected with a specific, field-level error.
- **Given** valid Name and Description, **when** Save & Continue is clicked, **then** the category is created (or updated) and the wizard advances to Step 2 with the new/updated id available to it.
- **Given** any field state, **when** Save as Draft is clicked, **then** the category is persisted with `status: "draft"` and the admin returns to the Category listing, seeing this category listed as Draft.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Blank Category Name | "Category Name is required." |
| Blank Description | "Description is required." |
| Duplicate Category Name | "A category with this name already exists." |
| Draft saved | "Category saved as draft." |
| Server/network error | "Something went wrong. Please try again." |

---

## Story: Step 2 — Expense Form (Define Expense Fields)

**As a** Company Administrator
**I want to** build a custom form of fields an employee fills in when claiming this category of expense
**So that** the right data is captured, consistently, for every claim under this category

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Expense Form | Field Library (left panel) | list of 14 clickable field-type buttons | — |
| Expense Form | Form Fields (center panel) | ordered list of added fields, each reorderable via a drag handle | — |
| Expense Form | Field Configuration (right panel) | appears when a field is selected/added; see below | — |
| Expense Form | "Save as Draft" / "Save & Continue" / "Cancel" | buttons, same behavior as Step 1 (Save as Draft hidden once `"active"`) | — |

**Field Library** (click to add — see [Open Questions](#open-questions--assumptions) on why this story treats "click to add" as the only way to *add* a field, reserving drag for *reordering* already-added fields): Invoice, File Upload, Amount, Number, Small Text, Large Text, List, City List, Dropdown, Radio Button, Date, Date & Time, Time, Duration.

**Field Configuration — sections common to every field**:

| Section | Field | Type | Notes |
|---------|-------|------|-------|
| (header) | Field Type | read-only label | e.g. "Invoice", "Amount" |
| Basic Details | Field Name | text, required | Auto-suggested as "New Field", "New Field1", … on add; must be edited to something meaningful before Save & Continue, see Validation |
| Basic Details | Tooltip | text, optional | 10–250 characters if provided |
| Basic Details | Required? | toggle | Whether the employee must fill this field on a claim |
| Basic Details | Add to Policy Rules | toggle | Whether this field becomes selectable as a Field Specific rule condition in Step 3 |
| Conditional Visibility | Show this field only if… | toggle → dropdown field + value | Disabled (with a note: "Add at least one Dropdown field to create conditional rules") until at least one Dropdown-type field exists elsewhere in the form; when enabled, this field only renders on the actual claim form if the chosen Dropdown field has the chosen value selected |
| Red Flags | Formula Based / AI Based | radio | See per-mode fields below |
| Red Flags | Highlight or Block | radio | What happens to a claim that trips this red flag |

**Red Flags, per mode**:
- **AI Based**: a "Describe your Red Flag" textarea, 50–500 characters, natural-language description an AI model uses to evaluate the field's value.
- **Formula Based**: a formula input, same `{{FieldName}}` auto-detect/autocomplete mechanic as the Amount/Number Formula Builder below, evaluated against this field's own value or other fields' values to decide whether to flag it.

**Field-specific configuration, by type**:

| Field Type | Field-specific settings |
|------------|--------------------------|
| Invoice | Types of File Allowed (multi-select chips: PDF, JPG, PNG, JPEG); Maximum File Size in MB (default 10); Maximum Number of Files Allowed (default 1). **Only one Invoice field is allowed per form** — once added, the Invoice button in the Field Library becomes disabled. |
| File Upload | Same three settings as Invoice (Types of File Allowed / Maximum File Size / Maximum Number of Files Allowed) — resolved this way since the source spec didn't separately define File Upload's configuration; no per-field-count limit (unlike Invoice, more than one File Upload field is allowed). |
| Amount | Allow Decimal (toggle); Minimum Value (number input); Maximum Value (number input); Formula Builder (text input with `{{FieldName}}` autocomplete — see below); **Use As Claim Amount (toggle)** — exactly one field in the whole form may have this on; turning it on for a new field automatically turns it off for whichever field had it before. |
| Number | Allow Decimal (toggle); Minimum Value; Maximum Value; Formula Builder — same as Amount, minus Use As Claim Amount. |
| Small Text | Minimum Length; Maximum Length; Allow Special Characters (toggle); Allow Numbers (toggle); Regex Validation (text input, with reference presets shown as help text: GST `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`, Email `^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`, Phone (India) `^[6-9][0-9]{9}$`). |
| Large Text | Minimum Length; Maximum Length. |
| List | Allow Multi-Select (toggle); Values List (dropdown choosing which predefined lookup list backs this field — **Airlines and Based Locations, confirmed as the starting set; more lookup lists are expected to be added before/at implementation time**, see [Open Questions](#open-questions--assumptions)). |
| City List | Allow Multi-Select (toggle) → if on, reveals Minimum Required Selection and Maximum Required Selection (number inputs). Values are always the full built-in city list — no separate list-picker. |
| Dropdown | Allow Multi-Select (toggle) → if on, reveals a manually-entered Options list, each option an input with its own delete button, plus an "Add More Options" button. |
| Radio Button | Same manually-entered Options list + "Add More Options"/delete-per-option pattern as Dropdown — no multi-select toggle, since radio is inherently single-select. |
| Date | Allow Past Date (toggle); Allow Future Date (toggle); **Use As Expense Date (toggle)** — exactly one Date field in the whole form must have this on (see form-level validation below); turning it on for a new field turns it off for whichever field had it before. |
| Date & Time | No field-specific settings beyond the common sections above. |
| Time | No field-specific settings beyond the common sections above. |
| Duration | No field-specific settings beyond the common sections above. |

**Formula Builder auto-detect** (Amount/Number fields' Formula Builder, and Red Flags' Formula Based mode): typing `{{` opens an autocomplete of eligible field names already in the form.
- Only Number and Amount fields may be referenced.
- Date fields support difference only, written as `{{End Date}} - {{Start Date}}`, and the result is a number of days — usable as an operand, not a field type you can otherwise reference.
- Field names are wrapped in `{{ }}`; arithmetic operators `*`, `/`, `+`, `-` combine them, e.g. `{{Quantity}} * {{Unit Price}}`.
- **Renaming a referenced field auto-updates every formula that references it** (by the underlying field id, not its display name — the stored formula tracks which field, and the name shown to the admin is always the field's current name) — a rename never breaks a formula. Deleting a referenced field is different and still breaks things — see [Edge Cases](#edge-cases).

### Flow

1. Clicking a Field Library item appends a new field to the Form Fields list with an auto-generated name ("New Field", "New Field1", …) and immediately opens that field's Field Configuration panel on the right.
2. Clicking an already-added field in the Form Fields list re-opens its Field Configuration panel (only one field's configuration is shown at a time).
3. Each Form Fields row has a drag handle; dragging reorders fields within the list (this reordering is the only drag-and-drop interaction in this story — see [Open Questions](#open-questions--assumptions)).
4. Deleting a field (trash icon on its row) removes it from the form entirely, along with anything that depended on it: its own Field Configuration, any Conditional Visibility rule elsewhere that referenced it as the controlling Dropdown, any Formula Builder that referenced it, and any Step 3 rule that referenced it via "Add to Policy Rules." Deleting a field that other configuration depends on shows a confirmation listing what will also be affected before proceeding.
5. **Form-level validation, checked on Save & Continue** (not per-field): at least one Date field must exist in the form; exactly one Date field must have Use As Expense Date on; at least one Amount field must exist; exactly one Amount field must have Use As Claim Amount on. These are shown as banner-style errors at the top of the Form Fields panel (matching the reference screenshot's "At least one Date field is required" banner) rather than under any single field, since they're about the form as a whole.
6. **Save & Continue** validates every field's own configuration (required sub-fields filled, Min ≤ Max pairs consistent, regex/formula syntax valid, at least one option for Dropdown/Radio Button, etc.) plus the form-level rules in point 5, persists the whole field list via this step's own save endpoint, and advances to Step 3.

### Validation Rules

| Field | Rule |
|-------|------|
| Field Name | Required. 2–100 characters. Must be unique within this category's form, case-insensitive (Formula Builder and Conditional Visibility both reference fields by name, so duplicates would be ambiguous). |
| Tooltip | Optional. 10–250 characters if provided. |
| Red Flag description (AI Based) | 50–500 characters. |
| Invoice / File Upload — Maximum File Size | 1–50 MB. |
| Invoice / File Upload — Maximum Number of Files | 1–10. |
| Amount / Number — Minimum/Maximum Value | Both optional; if both provided, Minimum ≤ Maximum. |
| Amount / Number — Formula Builder | Must reference only existing Number/Amount field names (or a Date-difference pair) already in the form; syntax must parse (balanced `{{ }}`, valid operators). |
| Small Text / Large Text — Minimum/Maximum Length | Both optional; if both provided, Minimum ≤ Maximum. |
| Small Text — Regex Validation | Must be a syntactically valid regular expression. |
| City List — Minimum/Maximum Required Selection | Both required once Allow Multi-Select is on; Minimum ≤ Maximum; Maximum ≤ total available cities. |
| Dropdown / Radio Button — Options | At least 2 options required once the Options list is shown; each option's text is required and unique within that field. |
| Form-level: Date fields | At least one Date-type field must exist; exactly one must have Use As Expense Date on. |
| Form-level: Amount fields | At least one Amount-type field must exist; exactly one must have Use As Claim Amount on. |

### Acceptance Criteria

- **Given** an empty form, **when** the admin clicks "Invoice" in the Field Library, **then** an Invoice field is added, its configuration opens, and the "Invoice" library button becomes disabled.
- **Given** a form with one Invoice field already added, **when** the admin looks at the Field Library, **then** "Invoice" is disabled/unavailable to add again.
- **Given** a form with no Date field, **when** Save & Continue is clicked, **then** a form-level "At least one Date field is required" error is shown and the step doesn't advance.
- **Given** a form with two Date fields and neither marked Use As Expense Date, **when** Save & Continue is clicked, **then** a form-level error requires exactly one to be marked.
- **Given** a Date field already marked Use As Expense Date, **when** the admin marks a different Date field Use As Expense Date, **then** the first field's toggle turns off automatically.
- **Given** the same Use-As-Claim-Amount behavior for Amount fields, **when** tested the same way, **then** it behaves identically (single-select, auto-unmark).
- **Given** a Dropdown field with Allow Multi-Select off and only one option entered, **when** Save & Continue is clicked, **then** an inline error requires at least 2 options.
- **Given** a field is deleted that another field's Conditional Visibility depends on, **when** the delete is confirmed, **then** the dependent field's Conditional Visibility is cleared (reverted to always-visible), not left dangling.
- **Given** valid configuration across every field and the two form-level rules, **when** Save & Continue is clicked, **then** the field list persists and the wizard advances to Step 3.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Invalid/missing Field Name | "Field Name is required." |
| Duplicate Field Name | "A field with this name already exists in this form." |
| Missing Date field | "At least one Date field is required." |
| No field marked Use As Expense Date | "Select one Date field to use as the expense date." |
| No Amount field | "At least one Amount field is required." |
| No field marked Use As Claim Amount | "At least one field must be selected as Claim Amount." |
| Invalid Formula Builder syntax | "Enter a valid formula using existing Number/Amount fields." |
| Invalid Regex Validation | "Enter a valid regular expression." |
| Fewer than 2 Dropdown/Radio options | "Add at least two options." |
| Min greater than Max (any field) | "Minimum value cannot be greater than maximum value." |
| Save succeeded | "Expense form saved." |
| Server/network error | "Something went wrong. Please try again." |

---

## Story: Step 3 — Policies and Approvals (Set Rules & Approvals)

**As a** Company Administrator
**I want to** define who's eligible for this category, what rules govern their claims, and who approves them
**So that** claims under this category are routed and validated correctly, with exceptions handled distinctly from the default case

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Policies and Approvals | "+ Create Claim Policy" button | button → adds a new Claim Policy card | — |
| Policies and Approvals | "+ Add Exception" button | button → adds a new Exception Policy card, **independent of any specific Claim Policy** (see below) | — |
| Policies and Approvals | Policy Name | text, per policy, auto-suggested "Policy 01"/"Policy 02"/… | No (auto-suggested value is usable as-is) |
| Policies and Approvals | Eligibility section | see below | Yes (at least one selection) |
| Policies and Approvals | Rules section | see below | No |
| Policies and Approvals | Approval Flows section | see below | Yes (at least one approver configured somewhere) |
| Policies and Approvals | "Save as Draft" / "Save & Continue" / "Cancel" | buttons — **Save as Draft on this step is not fully lenient, see Flow below** (also hidden once `"active"`) | — |

**Claim Policies and Exception Policies are two independent, flat lists at the category level — neither nests under the other.** The reference screenshots show "+ Add Exception" positioned near/below a Claim Policy card, but that's a layout choice, not a data relationship: an Exception Policy doesn't belong to any particular Claim Policy, isn't deleted when that Claim Policy is deleted, and is validated/counted entirely on its own.

**Both policy types share the same three-section shape**:

1. **Eligibility** — a "+ Add Eligibility" button opens a checklist (Select All / Department / Grade / New Project for a Claim Policy; a single Employee List multi-select for an Exception Policy); checking any of these reveals a corresponding multi-select field directly below. At least one value across whichever eligibility types are checked is required.
2. **Rules** — organized into Levels (Level 1, Level 2, …, added on demand via "+ Add Rule"). A **Claim Policy** has no fixed maximum level count; an **Exception Policy** is capped at exactly one Level (no "Level 2" option) — an exception is meant to be a narrow, specific carve-out, not another full rule tree. Within a level, "+ Add Rule" offers two rule kinds:
   - **Field Specific** — a single-field condition, only for fields whose Step 2 configuration has "Add to Policy Rules" on.
   - **Combination** — a condition combining a List/City List/Dropdown field's selected value with an Amount/Number field's value (e.g. "if Airline = Emirates, then Amount must be ≤ X").
   A level may hold multiple Field Specific and/or Combination rules, but not an exact duplicate (same field + same condition/operator/value) within that same level.
3. **Approval Flows** — up to 5 Levels (numbered 1–5, chosen from a Level dropdown — a policy doesn't have to use all 5). Each Level has one or more Stages; each Stage holds 1–3 approvers. Within a stage, **"+OR" adds an alternate approver** (any one of the OR'd approvers in that stage is sufficient), and **"+AND" adds another required approver to that same stage** (every AND'd approver in that stage must approve) — both count toward the 1–3-per-stage cap. Each Level (and the Default Flow, below) has an "Auto Approve (No manual approval required)" toggle that, when on, skips the approver requirement entirely for claims that reach it. Separately from the numbered Levels, every policy also has exactly one **Default Flow** with the identical Stage/Approver/AND/OR/Auto-Approve shape — **a claim uses whichever numbered Level's Rules match it; if no rule matches, it falls through to the Default Flow.**

### Flow

1. Landing on Step 3 for a brand-new category shows one Claim Policy card already present ("Policy 01") and zero Exception Policy cards — **Claim Policy is required (at least one, always)**; **Exception Policy is optional (zero is valid)**.
2. "+ Create Claim Policy" adds another Claim Policy card, up to a maximum of **20** per category; the button disables once that cap is reached.
3. "+ Add Exception" adds a new, independent Exception Policy card, up to a maximum of **5 Exception Policies per category**; the button disables once that cap is reached.
4. Each policy card is collapsible (chevron) and reorderable (drag handle); a copy icon duplicates a policy (name, eligibility, rules, and approval flow all copied, with the name suffixed so it doesn't collide).
5. **Deleting the last remaining Claim Policy doesn't reduce the count below one** — at least one Claim Policy card is always present; deleting it clears its fields back to a blank/default state rather than removing the card entirely. There's no confirmation dialog gating this — deletion (of any Claim Policy, including the last) always succeeds instantly. Exception Policies have no such floor and can be deleted down to zero freely, since they're optional.
6. Eligibility, Rules, and Approval Flows sections are each independently collapsible within a policy card.
7. **Both Save & Continue and Save as Draft validate that every Claim Policy present is actually filled in** (at least one eligibility value, at least one approver configured unless Auto Approve is on) — this step is the one place Save as Draft is *not* fully lenient the way Steps 1–2's is, since a blank Claim Policy card (e.g. the one always left behind after deleting the last one) can't meaningfully represent a saved state. Exception Policies, being optional, are only validated if at least one exists; a category with zero Exception Policies never blocks either button on that account.
8. **Save & Continue** additionally checks rule-level validity (no in-level duplicates), persists the whole policy set via this step's own save endpoint, and advances to Step 4.

### Validation Rules

| Field | Rule |
|-------|------|
| Claim Policy count | 1–20 per category — required, at least one always. |
| Exception Policy count | 0–5 per category — optional. |
| Eligibility | At least one value selected, across whichever of Department/Grade/Project (Claim Policy) or Employee (Exception Policy) is checked/shown. |
| Rules per level (Claim Policy) | No fixed maximum level count. No exact duplicate rule (same field + condition/operator/value) within one level. |
| Rules (Exception Policy) | Exactly one level only. |
| Approval Levels | 0–5 numbered Levels per policy, plus exactly one Default Flow (always present). |
| Approvers per stage | 1–3, unless that Level/Default Flow has Auto Approve on, in which case 0 approvers is valid. |
| Policy Name | Optional; if left blank, the auto-suggested "Policy NN" value is used; must be unique within the category if provided. |

### Acceptance Criteria

- **Given** a brand-new category reaching Step 3, **when** the step loads, **then** exactly one Claim Policy card is present by default and zero Exception Policy cards.
- **Given** 20 Claim Policies already exist, **when** the admin looks at "+ Create Claim Policy," **then** it's disabled.
- **Given** 5 Exception Policies already exist, **when** the admin looks at "+ Add Exception," **then** it's disabled.
- **Given** a Claim Policy with no Eligibility value selected, **when** Save & Continue **or** Save as Draft is clicked, **then** an inline "At least one value is required" error shows on that policy and neither action completes.
- **Given** an Exception Policy with no employee selected, **when** Save & Continue is clicked, **then** an inline "At least one employee is required" error shows.
- **Given** zero Exception Policies exist, **when** Save & Continue or Save as Draft is clicked, **then** neither is blocked on that account — Exception Policies are optional.
- **Given** an attempt to add a second rule to an Exception Policy's Rules Level 1 that's an exact duplicate of an existing one, **when** attempted, **then** it's rejected with an inline error and not added.
- **Given** a Stage with Auto Approve off and zero approvers configured, **when** Save & Continue or Save as Draft is clicked, **then** an inline "This field is required" error shows on that stage's approver selector.
- **Given** the only remaining Claim Policy, **when** its delete icon is clicked, **then** it's cleared to a blank default state immediately (no confirmation prompt), and the card remains present.
- **Given** that now-blank Claim Policy, **when** Save & Continue or Save as Draft is clicked without filling it back in, **then** the same "At least one value is required"/"This field is required" validation errors appear as they would for any incomplete policy.
- **Given** every Claim Policy present passes validation (and every Exception Policy, if any exist, also does), **when** Save & Continue is clicked, **then** the full policy set persists and the wizard advances to Step 4.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| No eligibility value selected | "At least one value is required." |
| No employee selected (Exception Policy) | "At least one employee is required." |
| Duplicate rule in the same level | "This rule already exists at this level." |
| Approver missing on a non-auto-approve stage | "This field is required." |
| Claim Policy cap reached | "You've reached the maximum of 20 claim policies." |
| Exception Policy cap reached | "You've reached the maximum of 5 exception policies." |
| Save succeeded | "Policies and approvals saved." |
| Server/network error | "Something went wrong. Please try again." |

---

## Story: Step 4 — Project Based Policies & Approvals

**As a** Company Administrator
**I want to** optionally define project-specific policies, or skip straight to activating the category
**So that** categories that don't need project-level variation aren't forced through unnecessary steps

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Project Based Policies & Approvals | "Enable Project Based Policies and Approval Flow?" | radio, Yes/No | Yes |
| Project Based Policies & Approvals | Project Policy cards (shown only if Yes) | same shape as an Exception Policy, see below | — |
| Project Based Policies & Approvals | "Save as Draft" / "Submit" / "Cancel" | buttons — the terminal step's primary button is "Submit," not "Save & Continue"; **when Yes is selected, Save as Draft is not fully lenient here either**, same as Step 3 (Save as Draft hidden once `"active"` — reopening an already-`active` category on this step only ever shows Submit) | — |

**Project Policy** — identical shape to an Exception Policy (Rules capped at one level, same Approval Flows shape), except **Eligibility shows only a Project List multi-select** (no Department/Grade/Employee option). Up to **5** Project Policies per category.

### Flow

1. Choosing **No** and clicking Submit finalizes the category immediately: no project policy cards are shown or required, and the category's `status` flips from `"draft"` to `"active"`.
2. Choosing **Yes** reveals the Project Policy cards area, starting with one card already present — same as Step 3's Claim Policy default — since **at least one Project Policy is required once Yes is selected** (switching from No to Yes adds that first card automatically; switching back to No before Submit discards any Project Policies entered so far).
3. Each Project Policy is added/removed/reordered/duplicated the same way Step 3's Claim Policies are, up to 5; **deleting the last remaining one while Yes is still selected doesn't reduce the count below one** — it clears that card to a blank/default state instead, the same way Step 3 handles the last Claim Policy (no confirmation prompt, deletion always succeeds instantly).
4. **Both Save as Draft and Submit validate that every Project Policy present is actually filled in** (at least one Eligibility value, at least one approver unless Auto Approve is on) whenever Yes is selected — same divergence from Steps 1–2's lenient Save as Draft as Step 3 has. Submit additionally requires at least one Project Policy to exist at all, persists them via this step's own save endpoint, and — on success — flips the category to `status: "active"`; there's no separate "submit"/"activate" endpoint, this one call does both.
5. Once a category is `"active"`, this whole wizard becomes an **edit** flow, not a create flow — re-opening it from the Category listing loads the shared category-detail endpoint's current state into all 4 steps, and any step's own save endpoint updates in place rather than creating anew.

### Validation Rules

| Field | Rule |
|-------|------|
| Enable Project Based Policies? | Required, Yes or No. |
| Project Policy count | 1–5 per category if Yes is selected (0 if No). |
| Project Policy Eligibility | At least one Project selected. |
| Project Policy Rules/Approval Flows | Same rules as Exception Policy (one rule level; 1–3 approvers per stage unless Auto Approve). |

### Acceptance Criteria

- **Given** No is selected, **when** Submit is clicked, **then** the category is marked `active` immediately with no project policies created.
- **Given** Yes is selected, **when** the Project Policy area first renders, **then** one policy card is already present, same as Step 3's Claim Policy default.
- **Given** Yes is selected and 5 Project Policies already exist, **when** the admin looks at the "add policy" control, **then** it's disabled.
- **Given** Yes is selected and the admin deletes the only remaining Project Policy, **when** the delete happens, **then** it's cleared to a blank default state immediately, and the card remains present — the count never reaches zero.
- **Given** that now-blank Project Policy, **when** Save as Draft or Submit is clicked without filling it back in, **then** the same "At least one value is required"/"This field is required" validation errors appear.
- **Given** Yes is selected with at least one Project Policy present and valid, **when** Submit is clicked, **then** the policies persist and the category is marked `active`.
- **Given** an already-`active` category is reopened, **when** the wizard loads, **then** every step is pre-filled from its current saved state, and Step 4 shows whichever of Yes/No was last chosen.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Neither Yes nor No selected | "Select whether to enable project-based policies." |
| Yes selected with zero Project Policies at Submit | "Add at least one project policy, or select No." |
| Project Policy cap reached | "You've reached the maximum of 5 project policies." |
| Attempt to remove the last remaining Project Policy | "A category must have at least one project policy when this is enabled." |
| No project selected in a Project Policy's Eligibility | "At least one project is required." |
| Category activated | "Category created and activated." |
| Server/network error | "Something went wrong. Please try again." |

---

## Shared Behavior Across All 4 Steps

- **Step navigation header**: shows all 4 steps with numbers, titles, and subtitles (matching the reference screenshots — "1 Basic Details / Setup category," etc.); the active step is highlighted, completed steps show a checkmark, and — per the reference screenshots' visual treatment of completed steps as clickable/green — an admin can navigate back to any already-completed step to revise it, which does not discard later steps' already-saved data (each step's data lives independently once saved, per the one-API-call-per-step design).
- **Save as Draft is only ever shown while the category is still `"draft"`** — it's available on every step (1 through 4) up until Step 4's Submit succeeds. **Once a category is `"active"`, the Save as Draft button disappears from every step entirely** — reopening an active category to edit it (see below) only ever offers each step's normal save action (Save & Continue / Submit), never a way to revert it back to Draft. A draft category, saved at any point via this button, is resumable later: reopening it from the Category listing loads whatever was last saved into every step, and the admin picks up from wherever they left off.
- **Save as Draft's leniency is not uniform across steps.** On Steps 1–2, it never enforces that step's own "advance" validation — a category name-only draft is valid, a half-configured field is still saved as-is. On **Step 3 (and Step 4, whenever Yes is selected)**, Save as Draft still requires every Claim Policy (and every Project Policy, if any) present to be minimally filled in — at least one Eligibility value, at least one approver unless Auto Approve is on — because a blank policy card can't meaningfully represent a saved state and at least one Claim Policy always exists on-screen (see Step 3's Flow). Exception Policies remain fully optional and never block either button by their absence.
- **Cancel** returns to the Category listing from any step without further changes; it does not delete an already-saved draft.
- A category is only ever `"active"` after Step 4's Submit succeeds; before that, however far the admin has progressed, it's `"draft"`. This transition is one-directional — nothing in this story reverts an `"active"` category back to `"draft"`.

## API Design

Per the source request's own framing: **Steps 2, 3, and 4 each persist through their own independent endpoint; Step 1's data is read (for every step, to pre-fill Basic Details' summary if shown) and written through one shared endpoint** rather than each step separately fetching it.

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| POST | `/api/categories` | `{ name, description, ziptrripCategoryIds? }` | `{ id, status: "draft" }` — first save of Step 1, creates the category |
| GET | `/api/categories/:id` | — | `{ category: { id, name, description, ziptrripCategoryIds, status, fields: [...], claimPolicies: [...], exceptionPolicies: [...], projectPolicies: [...], enableProjectPolicies } }` — the one shared "load everything" endpoint every step reads from |
| PATCH | `/api/categories/:id` | `{ name, description, ziptrripCategoryIds? }` | `{ message }` — Step 1's own update, also used by Save as Draft on Step 1 |
| PUT | `/api/categories/:id/fields` | `{ fields: [...] }` (the full ordered field list, replace-not-append, same pattern as [008](./008-employee-invitation.md)'s Company Access/FF Numbers) | `{ message }` — Step 2's save |
| PUT | `/api/categories/:id/policies` | `{ claimPolicies: [...], exceptionPolicies: [...] }` (full replace) | `{ message }` — Step 3's save |
| PUT | `/api/categories/:id/project-policies` | `{ enableProjectPolicies: boolean, projectPolicies: [...] }` (full replace) | `{ message, status: "active" }` — Step 4's save; **confirmed as the terminal call, no separate submit/activate endpoint exists.** On success — whether `enableProjectPolicies` is `false` (no policies) or `true` with a valid, non-empty `projectPolicies` array — this same call flips `status` from `"draft"` to `"active"`. |

Error responses follow the existing convention (`{ error: string }`): 400 (validation failures), 401 (no session), 403 (not a Company Administrator — same `requireOwner` gate as [010](./010-bulk-invite-employees.md)'s Bulk Invite, since category configuration is at least as sensitive as bulk employee changes), 404 (category not found or not in this organization), 409 (duplicate Category Name/Field Name), 500 (unexpected).

## Data Model

New tables, all organization-scoped through `Category.organizationId`:

- **`Category`**: `id`, `organizationId`, `name`, `description`, `status` (`"draft" | "active"`), `isEnabled` (boolean, default `true` — orthogonal to `status`: this is the Enable/Disable toggle [014](./014-category-listing.md) adds, meaningless while still `"draft"` since a draft was never usable in the first place), `enableProjectPolicies` (boolean), `createdBy`, `updatedBy`, timestamps.
- **`CategoryZiptrripMapping`**: `id`, `categoryId`, `ziptrripCategoryKey` (a string identifying which static Ziptrrip category, not a foreign key to any table this app owns).
- **`CategoryField`**: `id`, `categoryId`, `fieldType`, `fieldName`, `tooltip`, `isRequired`, `addToPolicyRules`, `position` (for ordering), `config` (a per-type JSON blob holding whichever field-specific settings apply — deliberately not one column per possible setting across 14 field types, most of which don't apply to any given row), `conditionalVisibility` (nullable JSON: `{ dependsOnFieldId, equalsValue }`), `redFlagMode` (`"formula" | "ai"`), `redFlagValue` (the formula or the AI description text), `redFlagAction` (`"highlight" | "block"`).
- **`CategoryPolicy`**: `id`, `categoryId`, `policyType` (`"claim" | "exception" | "project"`), `name`, `position`. **No `parentPolicyId`** — confirmed that Claim, Exception, and Project policies are three independent, flat lists distinguished purely by `policyType`; none nests under another despite the reference screenshots visually grouping "+ Add Exception" near a Claim Policy card.
- **`CategoryPolicyEligibility`**: `id`, `policyId`, `eligibilityType` (`"department" | "grade" | "project" | "employee"`), `entityId`.
- **`CategoryPolicyRule`**: `id`, `policyId`, `level`, `ruleType` (`"field_specific" | "combination"`), plus the condition itself (field/operator/value for Field Specific; comparisonFieldId/comparisonOperator/comparisonValue/amountFieldId/amountOperator/amountValue for Combination).
- **`CategoryApprovalLevel`**: `id`, `policyId`, `level` (1–5, nullable to represent "this row is the Default Flow" — or a separate `isDefaultFlow` boolean, cleaner than overloading `level`), `autoApprove` (boolean).
- **`CategoryApprovalStage`**: `id`, `approvalLevelId`, `stageNumber`.
- **`CategoryApprovalStageApprover`**: `id`, `stageId`, `employeeId`, `logicGroup` (an integer — approvers sharing a `logicGroup` value are OR'd together; different `logicGroup` values within the same stage are AND'd together — this is the simplest normalized shape for the "mixed AND/OR within one stage" behavior resolved above).

No existing table needs a new column — `Department`/`Grade`/`Project`/`Employee` are all referenced by id only, exactly like [008](./008-employee-invitation.md)'s `EmployeeCompanyAccess`/`EmployeeProject` already reference them.

## Validation Rules Summary

| Field type | Rule |
|------------|------|
| Category Name | 2–100 characters, unique per organization (case-insensitive) |
| Description | Up to 1,000 characters |
| Field Name | 2–100 characters, unique per category (case-insensitive) |
| Tooltip | 10–250 characters if provided |
| Red Flag (AI) description | 50–500 characters |
| Invoice/File Upload — Max File Size | 1–50 MB |
| Invoice/File Upload — Max Files | 1–10 |
| Formula Builder | References only existing Number/Amount fields (or a Date-difference pair), valid `{{ }}`/operator syntax |
| Regex Validation | Must compile as a valid regular expression |
| Dropdown/Radio Button options | At least 2, each unique within that field |
| Claim Policy count | 1–20 per category |
| Exception Policy count | 0–5 per category |
| Project Policy count | 0–5 per category |
| Approval Levels | 0–5 numbered, plus exactly 1 Default Flow, per policy |
| Approvers per stage | 1–3 unless Auto Approve is on |
| Exception/Project Policy rule levels | Exactly 1 |

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| CC-01 | Create category with valid Name/Description, no Ziptrrip mapping | Step 1 saves, advances to Step 2 |
| CC-02 | Duplicate Category Name within the org | Rejected with a field-level 409 error |
| CC-03 | Add an Invoice field, then try to add a second one | Invoice option is disabled in the Field Library |
| CC-04 | Save & Continue on Step 2 with zero Date fields | Blocked with a form-level error |
| CC-05 | Two Date fields, mark the second Use As Expense Date | First field's toggle auto-clears |
| CC-06 | Save & Continue on Step 2 with zero Amount fields marked Use As Claim Amount | Blocked with a form-level error |
| CC-07 | Formula Builder referencing a field that doesn't exist | Rejected as invalid syntax |
| CC-08 | Delete a field referenced by another field's Conditional Visibility | Confirmation shown; on confirm, the dependent Conditional Visibility clears |
| CC-09 | Add 21st Claim Policy | Blocked — "+Create Claim Policy" disabled at 20 |
| CC-10 | Add 6th Exception Policy | Blocked — "+Add Exception" disabled at 5 total (Exception Policies are independent of any Claim Policy) |
| CC-11 | Claim Policy with no Eligibility selected | Blocked with an inline error |
| CC-12 | Exception Policy Rules — attempt a second rule Level | Not offered — only Level 1 exists for Exception/Project policies |
| CC-13 | Duplicate rule within the same level | Rejected |
| CC-14 | Approval stage with 4 approvers attempted | 4th add is blocked at the UI level (3 max) |
| CC-15 | Approval stage with 0 approvers, Auto Approve off | Blocked with a required-field error |
| CC-16 | Approval stage with 0 approvers, Auto Approve on | Allowed |
| CC-17 | A claim's data matches Rules Level 2 but not Level 1 | Approval routes through Level 2's flow, not Default Flow |
| CC-18 | A claim's data matches no rule level | Approval routes through Default Flow |
| CC-19 | Step 4, select No, Submit | Category becomes `active` with no project policies |
| CC-20 | Step 4, select Yes, add 1 valid Project Policy, Submit | Category becomes `active` with that project policy saved |
| CC-21 | Step 4, select Yes, add 6th Project Policy | Blocked at 5 |
| CC-22 | Save as Draft on Step 1 or Step 2 with invalid/incomplete data | Saves successfully anyway (Draft bypasses "advance" validation on these two steps only) |
| CC-22b | Save as Draft on Step 3 with the default blank Claim Policy left unfilled | Blocked with the same inline validation errors Save & Continue would show — Step 3's Save as Draft is not fully lenient |
| CC-22c | Delete the only remaining Claim Policy, then click Save as Draft without refilling it | Blocked — the cleared-to-blank card still fails the same validation |
| CC-23 | Reopen an existing draft category | All 4 steps pre-fill from the shared detail endpoint's current saved state |
| CC-24 | Reopen an already-`active` category and change Step 2's fields | Step 2's own endpoint updates in place; category remains `active` |
| CC-25 | Non-owner employee attempts any category-wizard endpoint | 403, same as Bulk Invite's owner-only gate |
| CC-26 | View any step (1–4) of a `"draft"` category | "Save as Draft" button is visible on that step |
| CC-27 | View any step (1–4) of an already-`"active"` category | "Save as Draft" button is not rendered at all on any step — only the step's normal save action (Save & Continue / Submit) is shown |
| CC-28 | Save as Draft on Step 2 of a `"draft"` category, then reopen it later | The category is still `"draft"`, listed as resumable, and every step reloads exactly what was last saved |

## Edge Cases

| Scenario | Expected Result |
|----------|------------------|
| Field renamed after a Formula Builder or Conditional Visibility rule elsewhere already referenced it | No breakage — references are tracked by field id, so the formula/rule keeps working and displays the field's new name automatically |
| A field with "Add to Policy Rules" on is deleted, and a Step 3 rule already referenced it | Unlike a rename, a delete genuinely removes the field id the rule/formula depended on — the rule referencing the deleted field is also removed, with a warning shown before the delete is confirmed |
| Admin navigates back from Step 3 to Step 2 and removes the field currently marked Use As Claim Amount | Step 2's own form-level validation re-triggers on its next Save & Continue — an already-passed step doesn't retroactively re-validate until touched again |
| Two admins edit the same category concurrently | Last write wins per step (no optimistic-locking/conflict-detection built here — same level of rigor as every other multi-admin write path in this codebase, e.g. Grade/Department edits) |
| Category deleted while `active` and already used by real expense claims | Out of scope for this story — deletion/deactivation of an in-use category isn't specified here |
| Draft category abandoned indefinitely | No auto-expiry; stays a visible Draft on the listing until explicitly deleted or completed (out of scope: bulk draft cleanup) |
| City List field's Minimum Required Selection greater than the number of cities that exist | Rejected — Maximum must be ≤ total available cities, and Minimum ≤ Maximum |
| Regex Validation field combined with Allow Numbers/Allow Special Characters toggles that contradict it | Both apply — the regex is an additional constraint on top of the toggles, not a replacement; a value must satisfy all configured rules simultaneously |

## Out of Scope

- The Category **listing** screen itself (search/pagination over existing categories, per-card summary display) — see [014-category-listing.md](./014-category-listing.md).
- Deleting an already-`active` category, and enabling/disabling one — see [014](./014-category-listing.md)'s lifecycle actions.
- Editing an already-existing category (draft or active) and duplicating one — see [015-category-edit-and-duplicate.md](./015-category-edit-and-duplicate.md); this story (013) only covers the initial create flow.
- The actual claim-submission experience (an employee filling out the built form, red flags firing, approval routing executing) — this story defines the *configuration*, not runtime claim processing.
- Bulk import/export of category configurations.
- Versioning/audit history of changes to an already-active category's configuration — see [016-category-version-history.md](./016-category-version-history.md).
- The full, final enumeration of "Values List" lookup-list options for the List field type — Airlines and Based Locations are confirmed as the starting set, with more to be provided before/during implementation.
- Localization/multi-language field labels or tooltips.
- The "Daily Allowance" category type (a second tab alongside Cost Categories on the listing screen) — out of scope for this whole epic so far; this story, and [014](./014-category-listing.md)/[015](./015-category-edit-and-duplicate.md)/[016](./016-category-version-history.md), are Cost Categories only.

## Open Questions / Assumptions

- **Field-specific configuration for File Upload, Date & Time, Time, and Duration** wasn't specified in the source request. Resolved (per explicit confirmation): File Upload reuses Invoice's exact three settings; Date & Time/Time/Duration have no field-specific settings beyond the common Basic Details/Red Flags/Conditional Visibility sections. The source request's duplicate, conflicting "Date" configuration entry (Minimum/Maximum Length) was treated as a copy-paste error and dropped.
- **Approval stage AND/OR semantics** — resolved (per explicit confirmation): `+AND` adds another *required* approver to the same stage (all must approve); `+OR` adds an *alternate* approver to the same stage (any one suffices); both count toward the 1–3-per-stage cap.
- **"Level 1" vs "Default Flow"** — resolved (per explicit confirmation): a numbered Level's approval flow applies when that policy's Rules at the matching level are satisfied by the claim; if no rule matches, the Default Flow (always present, one per policy) applies instead.
- **Conditional Visibility** ("Show this field only if…", tied to Dropdown fields) — wasn't in the source request's typed field-configuration list at all, only visible in the reference screenshot. Resolved (per explicit confirmation): included in scope, as described above.
- **Approval Levels: up to 5 per policy** — resolved (per explicit confirmation) as the Level 1–5 dropdown directly bounding how many numbered levels a policy may define; the source text's separate "maximum three stages" phrase is treated as a garbled restatement of the already-explicit "1–3 approvers per stage" rule, not an additional cap on level *count*.
- **Rule Levels: no fixed maximum** — resolved (per explicit confirmation) for Claim Policies; a "duplicate" rule is defined as the same field with the same condition/operator/value repeated within one level. Exception and Project policies still cap at exactly one level, per the source request's explicit statement.
- **Use As Claim Amount / Use As Expense Date are both single-select across the whole form** — resolved (per explicit confirmation) as radio-like behavior: setting a new field un-sets whichever field previously held that flag, and both require at least one field to hold it before Step 2 can be completed.
- **Exception Policy cap (5) is a per-category total, not per-Claim-Policy** — confirmed. The reference screenshots' "+Add Exception" nesting inside a specific Claim Policy's card is purely where the button lives in the UI; the cap itself is tracked across the whole category, not reset per Claim Policy.
- **Project Based Policies require at least one policy once "Yes" is selected** — confirmed. Selecting Yes seeds one Project Policy card immediately (mirroring Step 3's Claim Policy default), and Submit is blocked at zero, the same way Step 3 requires at least one Claim Policy.
- **Renaming a field auto-updates every Formula Builder/Conditional Visibility reference to it** — confirmed. References are stored against the field's id, not its display name, so a rename is transparent to anything pointing at that field; only deleting a referenced field still breaks/removes what depended on it (see [Edge Cases](#edge-cases)).
- **"Values List" lookup options for the List field type** — confirmed as Airlines and Based Locations to start; more lookup lists are expected to be provided and added before or during implementation, so the `Values List` dropdown's option set should be built as an easily-extensible, centrally-defined list (e.g. a single constants file/table), not hardcoded inline wherever it's rendered.
- **Drag-and-drop applies only to reordering already-placed fields, not to adding new ones from the Library** — confirmed. Adding a field is click-only; the drag handle on each Form Fields row is solely for reordering.
- **Company Administrator enforcement** reuses the already-established `requireOwner` gate (`Employee.isOwner`), matching [010](./010-bulk-invite-employees.md)'s precedent — not re-litigated here since [010](./010-bulk-invite-employees.md)'s Open Questions already settled this question once for the whole codebase.
- **Claim, Exception, and Project policies are all independent, flat lists — none nests under another** — confirmed. The visual grouping of "+ Add Exception" near a Claim Policy card in the reference screenshots doesn't reflect a data relationship; `CategoryPolicy` has no `parentPolicyId`.
- **Deleting the last remaining Claim Policy (or Project Policy, when enabled) never reduces the count below one, and there's no confirmation dialog** — confirmed. It clears to a blank/default state instead; both Save & Continue/Submit *and* Save as Draft then validate that policy like any other incomplete one, which is why Save as Draft isn't fully lenient on Steps 3–4 the way it is on Steps 1–2.
- **No separate submit/activate endpoint** — confirmed. Every step, including Step 4, has its own independent save endpoint; Step 4's own call is what flips the category to `"active"` on success, with nothing additional to call afterward.
