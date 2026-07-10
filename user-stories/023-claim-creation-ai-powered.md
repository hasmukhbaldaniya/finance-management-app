# 023 - Claim Creation: AI-Powered (Automated Extraction)

**Status:** Draft
**Epic:** Claim Management

## Overview

Covers the "Automated Extraction" claim-creation mode reached from `022-claim-creation-manual.md`'s entry screen — upload one or more bills, let a real AI/ML service read them, and review/correct whatever it produced instead of typing every field by hand. Claim Type (standalone vs. trip-linked), the Category-driven dynamic expense form, Split Expense/Split Claim, and Save as Draft/Save Claim all work identically to `022`'s manual flow once this story reaches the review step — this doc only covers what's genuinely different: file upload, the AI/ML pipeline itself, the 3-column review UI, merging/unmerging invoice pages, and duplicate detection.

**A new AI/ML service and a new audit table, per your explicit instruction.** This is a real integration, not a stub: a dedicated backend service sends each uploaded invoice (image or single PDF page) to an LLM with vision capability, along with the organization's active categories (name, description, and each one's configured fields), and asks it to return: which category best matches, values for that category's fields, and a verdict on any of that category's `redFlagMode: "ai"` fields. Every call is logged to its own table for audit/debugging — see [Data Model](#data-model).

**This reuses Category Management's existing AI Red Flag mechanism exactly as already built — no schema change needed there.** `013-category-creation.md` already gives every `CategoryField` a `redFlagMode: "formula" | "ai"`, with `redFlagValue` holding the natural-language prompt when `"ai"` (e.g. "Flag if alcohol or non-vegetarian items are present") and `redFlagAction: "highlight" | "block"` deciding what happens when it fires. This story is what finally *evaluates* that prompt against a real bill — Category Management always had the hook, Claims is what calls it.

---

## Story: Upload Invoices for AI Extraction

**As a** logged-in employee
**I want to** upload several bills at once instead of entering each one by hand
**So that** logging a claim with many receipts is fast

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Create Claim (Step 1) | Claim Type | Same "Create New Claim" / "Link to Trip" radio as `022` | Yes |
| Create Claim (Step 1) | Claim Name / Trip Name | Same as `022` | Yes |
| Create Claim (Step 1) | Invoices upload | drag-and-drop or click-to-upload, PDF/JPG/JPEG/PNG, up to 10 files, 10MB each | Yes (at least 1) |
| Create Claim (Step 1) | "Back" / "Cancel" / "Save & Next" | buttons | — |

### Flow

1. Claim Type and Claim Name/Trip Name work exactly as `022` specifies — same fields, same validation, same "only `status: new` trips" rule.
2. **Each uploaded image becomes one "invoice source."** Each PDF's **page** becomes its own invoice source too — a 4-page PDF contributes 4 sources, shown in the uploaded-files list as one row for the file with its page count noted (e.g. "4 pages"), not 4 separate rows at this step.
3. **Up to 10 files** total (not 10 invoice sources/pages — a single 10-page PDF is one file, contributing 10 sources once processed). Each file up to 10MB.
4. Removing an uploaded file before "Save & Next" simply drops it — nothing has been processed yet at this point.
5. **"Save & Next"** requires at least one file, persists the claim (Claim Type + Name/Trip) and the uploaded files, and advances to the AI Processing Pipeline.

### Validation Rules

| Field | Rule |
|-------|------|
| Claim Type, Claim Name/Trip Name | Identical to `022` |
| Invoices | At least 1, at most 10 files, each ≤10MB, PDF/JPG/JPEG/PNG only |

### Acceptance Criteria

- **Given** a 4-page PDF is uploaded, **when** the file list renders, **then** it shows as one row noting "4 pages."
- **Given** 10 files are already uploaded, **when** an 11th is attempted, **then** it's rejected client-side before upload.
- **Given** zero files uploaded, **when** "Save & Next" is clicked, **then** it's blocked.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| File count exceeds 10 | "You can upload up to 10 files." |
| File exceeds 10MB | "Each file must be 10MB or smaller." |
| Unsupported file type | "Only PDF, JPG, JPEG, and PNG files are supported." |
| No files uploaded | "Upload at least one invoice." |

---

## Story: AI Processing Pipeline

**As a** logged-in employee
**I want to** see that the system is actually working on my uploaded bills
**So that** I'm not staring at a blank screen wondering if anything is happening

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| Create Claim (processing) | 4-stage progress list | — | "Reading invoice" → "Identifying expense types" → "Filling in the details" → "Checking policy compliance," each shown as done (checkmark) or in-progress (spinner), matching the reference screenshot exactly |
| Create Claim (processing) | Running totals | — | "Total Expenses" / "Total Amount" update as sources finish processing |

### Flow

1. Every invoice source (each image, each PDF page) is sent to the AI/ML service independently, in parallel, once "Save & Next" completes.
2. The 4 stages shown are a **fixed, illustrative sequence for the whole batch**, not a literal per-source progress bar — the same 4 stages this service always performs (read → categorize → extract fields → check policy) for every source, shown once at the batch level while sources complete individually in the background.
3. **Each source resolves into exactly one `Expense`, unless later merged (see below).** As soon as a source's extraction completes, its resulting expense is added to the running "Total Expenses"/"Total Amount" figures — the employee doesn't have to wait for the whole batch to finish before seeing progress.
4. Once every source has resolved (successfully or with an error — see [Edge Cases](#edge-cases)), the screen advances automatically to the Review step.

### Validation Rules

Not applicable — no form fields, this is a background process with a status display.

### Acceptance Criteria

- **Given** a batch of 3 sources, **when** processing starts, **then** the 4-stage list animates through in order.
- **Given** all sources have resolved, **when** the last one finishes, **then** the screen advances to Review automatically.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| The AI/ML service is unreachable or times out for a source | That source still reaches the Review step, blank/unfilled, same as any low-confidence extraction (see [Edge Cases](#edge-cases)) — not a hard failure for the whole batch |

---

## Story: Review & Edit AI-Extracted Expenses

**As a** logged-in employee
**I want to** check and correct what the AI filled in before submitting
**So that** I stay in control of what I'm actually claiming

### Screens & Fields

Three-column layout, matching the reference screenshot exactly:

| Column | Contents |
|--------|----------|
| Invoices (left) | One row per invoice source (or per merged group — see below), showing filename, file-type icon, and that source's own "Total Expenses" count. Clicking a row selects it. A red/warning border on a row indicates it needs attention (validation errors, or an unresolved multi-page PDF — see [Merge / Unmerge](#story-merge--unmerge-invoice-pages)). Bottom of this column: batch-wide "Total Expenses" / "Total Amount." |
| Preview Invoices (middle) | The selected source's image/PDF-page rendered with zoom controls, and an "AI-Processed" badge |
| Expense Form (right) | The same dynamic, Category-driven form `022` defines, pre-filled with whatever the AI extracted — each successfully auto-filled field carries an "Auto-filled" badge (matching the reference screenshot); fields the AI didn't confidently extract are simply blank, same required-field validation as manual entry |

### Flow

1. **Category is auto-selected** by the AI/ML service, choosing from the organization's active + enabled categories (`022`'s own "active categories only" rule applies here too) based on the bill's content.
2. **Field values are auto-filled per the selected category's own field configuration** — the same dynamic rendering `022` defines, just pre-populated instead of starting blank. Not every field succeeds: the reference screenshots show Amount/Vendor Name/Expense Date/Invoice Number reliably auto-filled on a clear bill, but a harder-to-read bill (crumpled, low-quality photo) may only get Amount and Taxes & Charges filled, leaving the rest for the employee to complete manually — this is expected, not a bug.
3. **The field marked `useAsClaimAmount` is filled from the bill's grand total** specifically (not a subtotal, not a line item) — per your own instruction.
4. Every field remains editable regardless of whether the AI filled it — this is a review-and-correct step, not a locked-in result.
5. Switching categories on an AI-reviewed expense (the employee disagrees with the AI's pick) re-renders the form for the newly-selected category; already-extracted values map onto identically-named/typed fields where possible, otherwise the field starts blank (no attempt to force-fit mismatched data).
6. **Duplicate Bill Detection** (see its own story below) runs at this step, not silently at final submission, so a flagged duplicate can be dealt with before the employee gets all the way to Save Claim.
7. **Save as Draft** / **Save Claim** work exactly as `022` defines.

### Validation Rules

Identical to `022`'s dynamic field rendering rules — nothing about arriving via AI changes what "valid" means for a given category's fields.

### Acceptance Criteria

- **Given** a clearly-scanned bill, **when** AI processing finishes, **then** Category, Amount, Vendor/equivalent, Expense Date, and Invoice Number (where the category has that field) are auto-filled with "Auto-filled" badges.
- **Given** a low-quality bill image, **when** AI processing finishes, **then** whatever couldn't be confidently extracted is left blank, not guessed.
- **Given** an auto-filled field, **when** the employee edits it, **then** the "Auto-filled" badge is removed (it's now a manual value).
- **Given** the employee changes Category on an AI-reviewed expense, **when** the form re-renders, **then** compatible field values carry over and the rest start blank.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| AI extraction failed for a source entirely | "Couldn't read this invoice automatically — please fill it in manually." (that source's expense form simply starts blank) |

---

## Story: Merge / Unmerge Invoice Pages

**As a** logged-in employee
**I want to** tell the system when several uploaded pages are actually one bill (or vice versa)
**So that** a multi-page receipt isn't wrongly split into several separate expenses, or a batch of separate bills wrongly forced into one

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| Invoices column | "Merge" action | button, available when 2+ sources from the *same uploaded PDF* are selected | Combines them into one expense |
| Invoices column | "Unmerge" action | button, available on a previously-merged expense | Splits it back into its original per-page sources |

### Flow

1. **By default, every PDF page is treated as a separate bill** (per the Note box shown on the entry screen and your own "Case 1" instruction: "if a single PDF has multiple bills, that's multiple bills") — this is the system's starting assumption, not something the employee has to confirm.
2. **When a bill genuinely spans multiple pages** (e.g. a 2-page hotel folio), the employee selects those pages' rows in the Invoices column and clicks **Merge**. This re-runs AI extraction treating the selected pages as one combined document — the resulting single expense's fields (especially Amount) reflect the whole merged document, not just the first page.
3. Merging is **only offered across pages from the same originally-uploaded PDF** — pages from two different uploaded files can't be merged into one bill (they're never assumed to be related).
4. **Unmerge** reverses this: a merged expense splits back into one expense per original page, each re-extracted independently (the same as if it had never been merged).
5. Merging/unmerging updates the batch's "Total Expenses" count and "Total Amount" immediately.

### Validation Rules

| Rule | Detail |
|------|--------|
| Merge requires 2+ selected sources | A single source can't be "merged" |
| Merge only within the same source PDF | Cross-file merging isn't offered |
| Unmerge only on a previously-merged expense | Not available on an expense that was never merged |

### Acceptance Criteria

- **Given** a 2-page PDF uploaded, **when** processing finishes, **then** it shows as 2 separate expenses by default.
- **Given** those 2 pages are selected and Merge is clicked, **when** merging completes, **then** they become 1 expense, re-extracted from both pages together.
- **Given** a merged expense, **when** Unmerge is clicked, **then** it splits back into its original 2 per-page expenses.
- **Given** an attempt to merge pages from two different uploaded PDFs, **when** the selection is made, **then** Merge isn't offered.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Merge attempted across different source files | "Only pages from the same uploaded file can be merged." |
| Merge/re-extraction fails | "Couldn't merge these pages — please try again or fill them in manually." |

---

## Story: Duplicate Bill Detection

**As a** Company Administrator
**I want to** be warned when the same bill is claimed more than once
**So that** the organization doesn't reimburse the same expense twice, even across different employees

### Flow

1. **Duplicate = same Expense Date + same Invoice/Bill Number + same Amount, checked at organization level** — confirmed — across every employee's expenses, not just the current claim or the current employee's own history. Expense Date and Amount are already reliably available on every expense via the existing `useAsExpenseDate`/`useAsClaimAmount` markers (`013`); the only piece that needed a new marker was Invoice/Bill Number, resolved in `022` as a new, optional `useAsInvoiceNumber` flag on `CategoryField`.
2. **This check only runs for categories where a field is marked `useAsInvoiceNumber`.** A category with no such field (e.g. a mileage or per-diem category with no invoice-number concept at all) simply isn't checked — this isn't a gap to fix, it's the correct behavior for a category that structurally has nothing to match on.
3. The check runs as each AI-extracted expense is reviewed (this story's own Review step) and again at final Save Claim for both flows (manual and AI) — an expense could be edited between those two points.
4. **A flagged duplicate is highlighted, not blocked** — confirmed. The employee sees which existing expense (claim name, date, employee) it matches and can still proceed; a genuine legitimate re-charge (rare, but possible) shouldn't be made impossible to submit. Whatever happens next (an approver seeing and acting on the flag) is part of the future Approval story, out of scope here.

### Validation Rules

| Rule | Detail |
|------|--------|
| Duplicate check scope | Organization-wide, across all employees |
| Duplicate match key | Expense Date + Invoice/Bill Number + Amount (exact match) |
| Categories with no field marked `useAsInvoiceNumber` | Not checked |

### Acceptance Criteria

- **Given** an expense with the same Expense Date, Invoice/Bill Number, and Amount as an already-existing expense (any employee, any claim, in this organization), **when** it's reviewed or saved, **then** it's visibly flagged (highlighted) as a possible duplicate, without blocking the save.
- **Given** a category with no field marked `useAsInvoiceNumber`, **when** an expense under that category is saved, **then** no duplicate check runs for it.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Duplicate detected | "This looks like a bill you've already claimed — {claimant name}'s claim on {date} has the same vendor, invoice number, and amount." |

---

## The AI/ML Service

**As a** system
**I want** one well-defined place that talks to the AI/ML provider
**So that** every call is consistent, logged, and swappable later

### Design

- A dedicated backend service (not inlined into the claims controller) responsible for exactly one thing: given one invoice source (an image, or a single PDF page rendered to an image) plus the organization's active+enabled categories (each with its name, description, and field configuration), call an LLM with vision capability and return a structured result: `{ suggestedCategoryId, confidence, extractedFields: { [categoryFieldId]: value }, redFlags: [{ categoryFieldId, triggered, reason }] }`.
- **Real integration, per your instruction** — this calls an actual LLM vision API (e.g. Claude) rather than a stub. The provider/model is a configuration value (matching this codebase's existing pattern of configuring external services via env vars — SMTP for email, a future SMS provider), not hardcoded.
- **Red flag evaluation reuses `CategoryField.redFlagMode`/`redFlagValue` exactly as `013` already defines them** — for each field on the matched category with `redFlagMode: "ai"`, the service includes that field's `redFlagValue` (the natural-language prompt, e.g. "non-veg or alcohol are not allowed") in its request and asks the model to judge whether the bill's content violates it, returning a verdict + a short reason. `redFlagAction` (`"highlight" | "block"`) then decides what the claim-review UI does with a triggered flag — highlighting it for the employee/approver to see, or blocking the expense from being saved at all.
- Every call — request and response — is logged to a new table, whether it succeeds, partially succeeds, or fails outright.

### API Design

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| POST | `/api/claims/:id/ai/extract` | `{ invoiceSourceId }` (internal, called by the processing pipeline, not directly by the frontend) | `{ suggestedCategoryId, confidence, extractedFields, redFlags }` |

This is an internal endpoint the processing pipeline calls per source — the frontend never calls it directly, it only polls/observes claim state during the pipeline story above.

## Data Model

New tables:

- **`ClaimInvoiceFile`**: `id`, `claimId` (FK), `originalFileName`, `storedPath`, `fileType` (`pdf|jpg|jpeg|png`), `fileSizeBytes`, `pageCount` (nullable, PDFs only), `uploadedAt`.
- **`AiExtractionLog`** (the dedicated AI/ML audit table, per your instruction): `id`, `claimInvoiceFileId` (FK), `pageNumber` (nullable), `expenseId` (FK → `Expense`, nullable until an expense actually results), `requestedAt`, `respondedAt`, `rawRequestSummary` (JSONB — what was sent, for audit, not the raw image bytes), `rawModelResponse` (JSONB — the full structured response), `suggestedCategoryId`, `confidence` (decimal, nullable), `redFlagEvaluations` (JSONB array), `status` (`pending|completed|failed`), `errorMessage` (nullable).
- **`Expense`** (defined in `022`) gains: `sourceInvoiceFileId` (FK, nullable — only set for AI-created expenses), `sourcePageNumber` (nullable), `mergedFromExpenseIds` (JSONB array, nullable — tracks a merged expense's original per-page sources, enabling Unmerge), `isRedFlagged` (boolean), `redFlagReason` (text, nullable).

## Validation Rules Summary

See each story's own table above.

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| CA-01 | Upload a 4-page PDF | Shows as one file row noting "4 pages" |
| CA-02 | Upload 11 files | 11th rejected client-side |
| CA-03 | Complete Save & Next with 0 files | Blocked |
| CA-04 | Watch the processing pipeline | 4 stages animate in order, then auto-advances to Review |
| CA-05 | Review a clearly-scanned meal bill | Category, Amount, Vendor, Date, Invoice Number auto-filled with badges |
| CA-06 | Review a low-quality bill photo | Only confidently-extracted fields filled; rest blank, no guessing |
| CA-07 | Edit an auto-filled field | "Auto-filled" badge disappears |
| CA-08 | Merge 2 pages from the same uploaded PDF | Combined into 1 re-extracted expense |
| CA-09 | Unmerge that expense | Splits back into 2 original per-page expenses |
| CA-10 | Attempt to merge pages from 2 different uploaded files | Not offered |
| CA-11 | Upload a bill containing alcohol, where the matched category has an `ai`-mode red flag prompt about alcohol | Expense is flagged/highlighted (or blocked, per that field's `redFlagAction`) |
| CA-12 | Submit an expense matching an existing org-wide Expense Date + Invoice/Bill Number + Amount | Flagged (highlighted) as a possible duplicate, not blocked |
| CA-13 | Submit an expense under a category with no field marked `useAsInvoiceNumber` | No duplicate check runs |

## Edge Cases

| Scenario | Expected Result |
|----------|------------------|
| The AI/ML service times out or errors for one source in a batch | That source's expense arrives at Review blank/unfilled; the rest of the batch is unaffected |
| An uploaded PDF is password-protected or corrupted | Flagged with an error in the Invoices column, no expense created for it, doesn't block the rest of the batch |
| A merged expense's combined Amount, after re-extraction, doesn't match the sum of what each page showed independently before merging | The merged (combined-document) extraction is authoritative — no reconciliation against the pre-merge per-page values is attempted |
| The organization has zero active+enabled categories | AI extraction can't suggest one — every expense arrives with Category blank, same as any other unresolvable field |

## Out of Scope

- Everything `022` already scopes out (approval routing, the listing screen, editing a submitted claim).
- Retraining, fine-tuning, or improving the AI/ML model's accuracy over time — this story defines the integration and the audit trail, not a feedback/improvement loop.
- A confidence-threshold UI (e.g. only showing "Auto-filled" above some percentage) — assumed binary (extracted or not) for this first version.

## Open Questions / Assumptions

- **`022`'s `city_list` migration** (real `Country`/`City` catalog instead of the hardcoded list) applies to this flow's own review-step rendering too, since it uses the same dynamic field renderer.
- **Which LLM/provider** — assumed to be whichever vision-capable model this codebase's environment already has access to (e.g. Claude), configured the same way SMTP/SMS providers are — needs an explicit choice and API key/credential before implementation, not assumed silently.
- **Merge/re-extraction cost** — re-running AI extraction on every Merge action is a real, repeated cost per call to the AI/ML provider; acceptable for a first version, worth revisiting if merge/unmerge turns out to be a frequent action.
