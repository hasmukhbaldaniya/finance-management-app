# 027 - Split Claim & Split Expense: Cross-Employee Percentage Split (Redesign)

**Status:** Draft
**Epic:** Claim Management

## Overview

This redesigns and **consolidates three existing, separate features into two**, based on the reference screenshots (both the AI-Powered and Manual Add Claim flows):

- **`022`'s "Split a Claim" / "Move to New Claim"** (move a subset of your own expenses onto a brand-new claim you still own, same employee) — **removed**, replaced by the new "Split Claim" below.
- **`022`'s original "Split Expense"** (divide one expense's Amount across 2+ Category/Amount portions, same employee, same claim) — **removed**, replaced by the new "Split Expense" below.
- **`025`'s "Split with Colleagues"** (percentage/amount cross-employee request, one expense at a time) — **superseded and renamed**: this is now what "Split Expense" means. `025`'s own request/response mechanics (Split Request inbox, email notification, per-request Accept/Reject) are **kept as-is and reused unchanged** — only the trigger button's label/scope changes, not the underlying accept/reject workflow.

The result is **two actions, same UI mechanic, different scope**:

| Action | Scope | Trigger |
|--------|-------|---------|
| **Split Expense** | Just the one expense being edited | Per-expense "Split Expense" button on the expense panel |
| **Split Claim** | Every expense currently on the claim | Claim-level "Split Claim" button, next to "Add Expense" |

Both open the same dialog shape: a searchable multi-select of same-organization colleagues ("Split Among"), a Member Name / Percentage / Amount table, and a read-only "Total Amount" footer. Both flows are available in **both** claim-creation paths — Manual Add Claim (`022`) and the AI-Powered Automated Extraction review screen (`023`).

**Confirmed decisions** (asked and confirmed before writing this doc):
1. All three old features above are replaced — nothing from them stays as a separate third action.
2. Submitting still uses `025`'s existing request/response model — colleagues get a pending entry in their own Split Request inbox and must Accept/Reject; nothing is created for them immediately on submit.
3. Percentages/amounts must sum to **exactly** 100% / exactly the amount in scope before Submit enables — not "up to 100%."
4. For Split Claim, the same chosen percentages are applied **independently to every expense** on the claim (one resulting split per original expense, each keeping its own Category) — not one lump-sum total detached from any Category.
5. **Both Percentage and Amount are directly editable per row, not just Percentage with Amount as a read-only derived display.** The even auto-redistribution (point 3 above/below) only happens on membership add/remove; after that, the employee can hand-edit either column for any row. Editing a row's Percentage recalculates that row's Amount; editing a row's Amount recalculates that row's Percentage. Editing one row never auto-rebalances any other row.

**Revised after initial implementation, confirmed with the employee working the flow (not a re-ask of the four points above, an amendment on top of them):**
6. **"Yes, Submit" no longer creates anything immediately — it stages the chosen split locally, and the actual Split Request(s)/email(s) are only created once the whole claim is saved via "Save Claim."** This surfaced as a real bug during testing: the split dialogs were computing their own Amount from the claim's server-side denormalized `amount` column, which doesn't exist/is stale until a save round-trip — meaning a freshly-typed Amount showed as ₹0 in the dialog, and submitting before ever saving the claim hit the backend's own "select a category and enter an amount" gate. Rather than force a silent save-then-open round-trip before every dialog open (the first fix attempted), the simpler and more correct model is: the dialogs always compute Amount from the *live* form values (so they're never wrong, saved or not), and the actual backend call is deferred until Save Claim — at which point the expense's amount is guaranteed fresh, since it was just saved in the same action. **Save as Draft never triggers a Split Request or email — only Save Claim does.** Reopening a dialog after staging a split pre-fills the previously chosen percentages/colleagues.
7. **Split Claim and any individually-staged Split Expense are mutually exclusive**, not stackable. Both apply to the exact same set of expenses when they overlap, so staging one while the other is already staged would double-split the overlapping expense(s) once both are submitted at Save Claim time. Staging a Split Claim clears every individually-staged Split Expense; staging an individual Split Expense clears a staged Split Claim. Each side shows a toast explaining what got cleared.
8. **Split Expense's trigger button moved to the bottom of the expense panel**, below that expense's own fields (Paid By included) — not in the panel's header row alongside the Category dropdown, where it originally sat. Split Claim's own trigger stays at the top of the page, unchanged.
9. **The colleague names of a staged split show next to its trigger button** ("Split with: Ada Lovelace, Grace Hopper"), for both Split Expense (per-expense) and Split Claim (page-level) — visible without reopening the dialog, and the button label itself switches to "Edit Split"/"Edit Claim Split" once something is staged.

---

## Story: Split Expense — Share One Expense With Colleagues

**As a** logged-in employee entering a shared expense
**I want to** split just this one expense's cost across colleagues in my organization, by percentage
**So that** I only claim reimbursement for my own share, and they can claim theirs

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Expense panel (Manual or AI-Powered claim) | "Split Expense" / "Edit Split" button, **at the bottom of the panel, below Paid By** (not in the header row) | button → opens the Split Expense dialog | — |
| Expense panel | "Split with: {colleague names}" | read-only text, shown next to the button only once a split is staged | — |
| Split Expense dialog | Split Among | searchable multi-select combobox, same-organization employees only, max 10 total including the requester | Yes, at least 1 (the requester alone counts) |
| Split Expense dialog | Member Name / Percentage / Amount (repeated, one row per selected member, requester always included and always first) | Percentage: number input; Amount: number input — both directly editable, each recalculates the other for that row | Yes, every row's Percentage > 0 |
| Split Expense dialog | Total Amount (footer) | read-only, sum of every row's Amount, computed from the expense's *live* form values (not a saved/persisted amount — see Flow point 6) | — |
| Split Expense dialog | Cancel / "Yes, Submit" | buttons | — |

### Flow

1. Reached from the expense panel's "Split Expense" button — **disabled until every required field on that expense is filled** (not just Category + Amount as today's gate does — Category, Receipt/Invoice, Expense Date, Vendor Name, Amount, Paid By, and any other category-specific required field per that Category's own configuration).
2. Opening the dialog defaults "Split Among" to just the requester, at 100% — unless a split was already staged for this expense in this editing session, in which case it reopens showing that same staged selection/percentages instead of resetting.
3. **Adding or removing a member re-distributes Percentage evenly across every currently-selected member** (not "new member starts at 0%"): `base = floor(100 / memberCount)`, remainder = `100 - base × memberCount`, and the remainder is added one point at a time starting from the requester's own row until it's used up. E.g. 3 members → 34/33/33 (requester gets the extra point); 2 members → 50/50. This matches the reference screenshots exactly (a lone member always resets to 100%; adding two colleagues to make 3 total produces 34/33/33, not 100/0/0).
4. After the auto-redistribution, **both Percentage and Amount stay directly editable per row**: hand-editing a row's Percentage recalculates that row's Amount (`Percentage × the expense's own Amount field`, rounded to 2 decimals); hand-editing a row's Amount recalculates that row's Percentage (`Amount ÷ the expense's own Amount field × 100`). Editing one row never auto-rebalances any other row — the employee adjusts each row manually, same as `025`'s existing behavior, just now from either column.
5. **"Yes, Submit" stays disabled until Percentages sum to exactly 100%** (equivalently, since the two columns are kept in sync per row, Amounts sum to exactly the expense's Amount). Summing to less than 100%, or more than 100%, both keep it disabled — there's no "leave an unsplit remainder for yourself" mode.
6. **"Yes, Submit" only stages the chosen split locally — it does not create anything yet.** The dialog closes, the expense panel shows "Split with: {colleague names}" and the button switches to "Edit Split." The actual Split Request (one per invited colleague, excluding the requester's own retained row) is only created — with its email + Split Request inbox entry — once the whole claim is saved via **Save Claim** (not Save as Draft; see this story's shared [Confirmed decisions](#overview) point 6). From that point on it's `025`'s existing "Request to Split an Expense With Colleagues" flow unchanged — colleagues must individually Accept/Reject, and the requester's own expense is untouched until they do.
7. **Staging a split here clears any staged Split Claim** (see the Split Claim story's own Flow) — the two are mutually exclusive, since Split Claim already covers this same expense.

### Validation Rules

| Field | Rule |
|-------|------|
| Split Among | 1–10 members total (including the requester), all in the requester's own organization, no duplicates |
| Percentage | Every selected member's Percentage > 0; sum across all members must equal exactly 100. Directly editable per row (recalculates that row's Amount). |
| Amount | Every selected member's Amount > 0; sum across all members must equal exactly the expense's own Amount field. Directly editable per row (recalculates that row's Percentage). |
| "Split Expense" button (trigger) | Disabled until every required field on that expense is filled |

### Acceptance Criteria

- **Given** an expense with Amount ₹1,000 and 3 members selected, **when** the dialog opens after adding the 2nd and 3rd member, **then** Percentages auto-fill to 34/33/33 and Amounts show ₹340.00/₹330.00/₹330.00.
- **Given** the same 3-member split, **when** the employee hand-edits one row's Amount from ₹330.00 to ₹350.00, **then** that row's Percentage updates to 35% and no other row changes.
- **Given** percentages summing to 99%, **when** "Yes, Submit" is checked, **then** it's disabled.
- **Given** an expense missing a required field (e.g. Vendor Name), **when** the employee looks at the expense panel, **then** "Split Expense" renders disabled.
- **Given** a valid 100%-summing split across 2 colleagues, **when** "Yes, Submit" is clicked, **then** the dialog closes, the panel shows "Split with: {names}" and "Edit Split," and **no** email or Split Request is created yet.
- **Given** that same staged split, **when** the employee clicks Save as Draft, **then** still no Split Request/email is created.
- **Given** that same staged split, **when** the employee clicks Save Claim, **then** both colleagues receive an email + Split Request inbox entry, and the requester's own expense is unchanged until they respond (per `025`).
- **Given** a staged individual Split Expense on one expense, **when** the employee then stages a Split Claim, **then** the individual Split Expense selection is cleared (toast explains why) and only the Split Claim applies at Save Claim time.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Sum ≠ 100% on submit attempt (defensive, since the button should already be disabled) | "Splits must add up to 100%." |
| Split staged via "Yes, Submit" (no longer an immediate send — see Flow point 6) | "Split saved — it'll be sent to your colleagues when you save this claim." |
| Staging this split cleared an existing staged Split Claim | "Split Claim was cleared — it can't apply together with an individual Split Expense." |
| A staged split's Split Request couldn't be created at Save Claim time (e.g. a colleague left the org in the meantime) | "N split request(s) couldn't be sent — reopen this claim's Edit page to retry." |

---

## Story: Split Claim — Share Every Expense in This Claim With Colleagues

**As a** logged-in employee with multiple expenses on one claim
**I want to** split every expense on the claim across the same colleagues by percentage, in one action
**So that** I don't have to repeat "Split Expense" once per line item

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Claim-level header (Manual or AI-Powered claim), next to "Add Expense" | "Split Claim" / "Edit Claim Split" button | button → opens the Split Claim dialog | — |
| Claim-level header | "Split with: {colleague names}" | read-only text, shown next to the button only once a split is staged | — |
| Split Claim dialog | Info banner: "All expenses listed here will be split with the selected team members" | static text | — |
| Split Claim dialog | Split Among | same searchable multi-select as Split Expense | Yes, at least 1 |
| Split Claim dialog | Member Name / Percentage / Amount (repeated) | same as Split Expense — both directly editable per row, computed against the **claim's total** instead of one expense's Amount | Yes |
| Split Claim dialog | Total Amount (footer) | read-only, sum of every expense's own Amount across the whole claim, computed from each expense's *live* form values (not a saved/persisted amount) | — |
| Split Claim dialog | Cancel / "Yes, Submit" | buttons | — |

### Flow

1. "Split Claim" is **disabled until every expense currently on the claim has all of its own required fields filled** — a claim with even one incomplete expense can't be split yet (see [Open Questions](#open-questions--assumptions) — this is the stricter of two reasonable readings and needs confirming).
2. Total Amount = the sum of every expense's own Amount field on the claim (confirmed against the reference screenshots: a claim with one ₹1,000 expense and one ₹3,332 expense shows a Split Claim Total Amount of ₹4,332.00).
3. Same member-selection, even-redistribution, and post-redistribution hand-editing mechanic as Split Expense (both Percentage and Amount stay directly editable per row), just computed against the claim's combined total instead of one expense's Amount. Reopening after staging pre-fills the previously chosen selection, same as Split Expense.
4. **"Yes, Submit" only stages the chosen split locally** — same deferred model as Split Expense (see this story's shared [Confirmed decisions](#overview) point 6). The dialog closes, the claim header shows "Split with: {colleague names}" and the button switches to "Edit Claim Split." Nothing is created yet.
5. **At Save Claim time (not Save as Draft), the staged percentages (not the claim-level Amounts) are applied independently to every expense on the claim** — this is really "run Split Expense once per expense, using the same colleague set and percentages each time," not one lump-sum split detached from Category. A claim with 2 expenses and 1 invited colleague at 30% produces two separate Split Requests (one per original expense), each reflecting that expense's own Category and 30% of that expense's own *just-saved* Amount — the per-expense Amounts are derived from the shared Percentage against each expense's fresh, post-save amount, not from the claim-level Amount column.
6. Each resulting Split Request still goes through `025`'s existing per-expense Accept/Reject flow unchanged. **Unlike this story's original assumption, the N requests created by one "Split Claim" action are not grouped in the recipient's inbox** — each shows up as its own independent entry, same as if "Split Expense" had been run N separate times. Bundled-inbox display (one card, "N expenses") was never built; see [Open Questions](#open-questions--assumptions), which now reflects this as the current, not-yet-decided state rather than an assumption pending confirmation.
7. **Staging a Split Claim clears every individually-staged Split Expense** (see that story's own Flow point 7) — the two are mutually exclusive, since Split Claim already covers every expense those individual splits would apply to.

### Validation Rules

Same shape as Split Expense's table above, applied at the claim level:

| Field | Rule |
|-------|------|
| Split Among | 1–10 members total, same organization, no duplicates |
| Percentage | Sum across all members must equal exactly 100. Directly editable per row (recalculates that row's Amount against the claim's total). |
| Amount | Sum across all members must equal exactly the claim's total. Directly editable per row (recalculates that row's Percentage). |
| "Split Claim" button (trigger) | Disabled until every expense on the claim has all of its own required fields filled |

### Acceptance Criteria

- **Given** a claim with 2 expenses (₹1,000 and ₹3,332) and one colleague added at 50/50, **when** "Yes, Submit" is clicked, **then** the dialog closes, the header shows "Split with: {name}" and "Edit Claim Split," and **no** Split Request is created yet.
- **Given** that same staged claim split, **when** the employee clicks Save Claim, **then** 2 separate Split Requests are created — one for each original expense, each split 50/50 between the requester and that colleague, each keeping its own original Category and reflecting that expense's own just-saved Amount.
- **Given** a claim where the 2nd expense hasn't had its required fields filled in yet, **when** the employee looks at the claim header, **then** "Split Claim" renders disabled.
- **Given** the same 2-expense claim, **when** the colleague accepts only the ₹1,000 expense's Split Request and rejects the other, **then** they end up with exactly one new Draft claim (for the accepted expense only) — the rejected one creates nothing.
- **Given** a staged Split Claim, **when** the employee then opens a specific expense's Split Expense dialog and submits an individual split for it, **then** the staged Split Claim is cleared (toast explains why) and only that individual split applies at Save Claim time.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Sum ≠ 100% on submit attempt | "Splits must add up to 100%." |
| Split staged via "Yes, Submit" (no longer an immediate send — see Flow point 4) | "Split saved for N expenses — it'll be sent when you save this claim." |
| Staging this split cleared existing individually-staged Split Expense selections | "Your individual Split Expense selections were cleared — Split Claim now applies to every expense instead." |
| One or more of the staged split's requests couldn't be created at Save Claim time | "N split request(s) couldn't be sent — reopen this claim's Review screen to retry." |

---

## Validation Rules Summary

| Rule | Detail |
|------|--------|
| Member count | 1–10 total (requester + up to 9 colleagues), matching `025`'s existing cap |
| Percentage sum | Must equal exactly 100 — not ≤ 100, not > 100 |
| Same organization | Every selectable colleague must belong to the requester's own organization (server-enforced, not just UI-filtered) |
| Trigger button gate | Split Expense: every required field on that one expense filled. Split Claim: every required field on every expense on the claim filled |
| Even redistribution | `base = floor(100 / n)`, remainder distributed one point at a time starting from the requester's row, on every add/remove of a member |
| Post-redistribution editing | Both Percentage and Amount are directly editable per row after the auto-redistribution; editing either recalculates the other for that row only, never rebalancing any other row |
| Deferred creation | Neither Split Expense nor Split Claim ever calls the backend from "Yes, Submit" — both stage locally and only call it from Save Claim's own success handler, never from Save as Draft |
| Mutual exclusivity | Staging a Split Claim clears every staged individual Split Expense; staging an individual Split Expense clears a staged Split Claim. The two never coexist going into Save Claim. |

## API Design

Reuses `025`'s existing per-expense endpoint for both flows, called from the frontend's Save Claim success handler rather than from either dialog's own "Yes, Submit" (see this story's shared [Confirmed decisions](#overview) point 6) — Split Claim is implemented as the frontend calling it once per expense on the claim, not a new bulk endpoint. No wrapping bulk/atomic endpoint was built (the "if atomicity matters" option below was never taken up); a partial failure (e.g. one expense's request fails while others succeed) surfaces as a toast naming how many failed, with no automatic retry or rollback of the ones that succeeded:

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| POST | `/api/claims/:claimId/expenses/:expenseId/split-requests` | `{ splitType: "percentage", members: [{ employeeId, percentage }] }` (unchanged from `025`, scoped under the claim rather than a bare `/expenses/:expenseId` path) | `{ id }` |

**Removed** (no longer called from the frontend, since the features they backed are being removed):
- `POST /api/claims/:claimId/split` (`splitClaim.api.ts` — the old "Move to New Claim")
- `POST /api/claims/:claimId/expenses/:expenseId/split` (`splitExpense.api.ts` — the old Category/Amount-portions split)

Whether to also delete these two endpoints/routes server-side, or just stop calling them from the frontend, is a backend decision out of this doc's own scope — flagged in Open Questions.

## Data Model

No new tables beyond what `025` already defines (`ExpenseSplitRequest`, `ExpenseSplitRequestMember`) — Split Claim just creates multiple `ExpenseSplitRequest` rows (one per expense) in one action, all at Save Claim time. **No `splitBatchId`-style link was added** — the N requests from one Split Claim action have no link to each other in the data model beyond "same requester, similar timestamps," so grouped-inbox display isn't achievable today without inferring it. This is the current, shipped state, not a pending decision (see the Split Claim story's own Flow point 6 and [Open Questions](#open-questions--assumptions)).

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| SC-01 | Split Expense with only the requester selected, no colleague added | "Yes, Submit" stays disabled (at least 1 colleague required — the Open Question below is resolved this way, not as a reachable self-only no-op) |
| SC-02 | Add a 2nd, then 3rd colleague to Split Expense | Percentages recompute to 50/50, then 34/33/33 |
| SC-03 | Hand-edit one member's percentage after auto-redistribution | That row's Amount recalculates to match; other rows stay as they were, no auto-rebalance |
| SC-03b | Hand-edit one member's Amount after auto-redistribution | That row's Percentage recalculates to match; other rows stay as they were, no auto-rebalance |
| SC-04 | Percentages summing to 99% | Submit disabled |
| SC-05 | Percentages summing to 101% | Submit disabled |
| SC-06 | Expense missing a required field | "Split Expense" button renders disabled |
| SC-07 | Claim with one incomplete expense | "Split Claim" button renders disabled |
| SC-08 | Split Claim across 2 expenses, 1 colleague at 40%, then Save Claim | 2 independent Split Requests created (not grouped) at Save Claim time — one per expense, each 40% of that expense's own just-saved Amount, correct Category preserved per request |
| SC-09 | Colleague accepts one of two independent Split Requests from the same Split Claim action but rejects the other | Exactly one new Draft claim created, for the accepted expense only |
| SC-10 | Attempt to add a colleague from a different organization (bypassing the UI) | Rejected server-side, same as `025`'s existing rule |
| SC-11 | Old "Move to New Claim" / old category-portions "Split Expense" UI | No longer reachable anywhere in either claim-creation flow |
| SC-12 | Stage a Split Expense, click Save as Draft (not Save Claim) | No Split Request/email created; the staged split persists in the still-open form for a later Save Claim |
| SC-13 | Stage a Split Expense on Expense A, then stage a Split Claim | Expense A's individual staged split is cleared (toast shown); only the Split Claim applies at the next Save Claim |
| SC-14 | Stage a Split Claim, then open Expense A's Split Expense dialog and submit an individual split for it | The staged Split Claim is cleared (toast shown); only Expense A's individual split applies at the next Save Claim |
| SC-15 | Stage a split, close the dialog, reopen it for the same expense/claim without saving | Dialog reopens pre-filled with the previously staged colleagues/percentages, not reset to solo 100% |
| SC-16 | A staged split's colleague names, after staging | "Split with: {names}" shown next to the trigger button, which itself reads "Edit Split"/"Edit Claim Split" |
| SC-17 | Locate "Split Expense" on an expense panel | Renders at the bottom of the panel, below Paid By — not in the header row next to Category |

## Out of Scope

- Anything about **how an accepted split's resulting claim looks or behaves** once created — unchanged from `025`, not re-specified here.
- Editing or cancelling a Split Claim/Split Expense action once submitted.
- Rounding-remainder reconciliation beyond "percentages must sum to exactly 100" — if per-member Amount rounding (₹ to 2 decimals) doesn't sum to the exact expense Amount to the paisa, this doc doesn't specify which member absorbs the difference (see Open Questions).
- Whether the two removed endpoints (`splitClaim.api.ts`/`splitExpense.api.ts`'s backend routes) are deleted server-side or just orphaned.

## Open Questions / Assumptions

- **Split Claim's trigger gate** — assumed "every expense on the claim must have all its required fields filled" (the stricter reading) rather than "at least one complete expense is enough, incomplete ones are simply excluded from the split." **Shipped as the stricter reading** — still not explicitly re-confirmed after implementation, so still listed here rather than promoted to a Confirmed decision.
- **Self-only split (SC-01)** — **resolved**: Submit stays disabled until at least one colleague beyond the requester is added; a requester-only "split" is not a reachable, submittable state.
- **Rounding remainder** — if 3 members split ₹1,000 at 34/33/33%, the derived Amounts (₹340/₹330/₹330) sum exactly here, but not every Amount will divide evenly. Assumed the UI silently accepts whatever rounding produces without forcing an exact-to-the-paisa reconciliation (matching `025`'s own "no automatic penny-rounding adjustment" stance) — still unresolved, unchanged by the deferred-submission work.
- **Bundled inbox grouping — resolved as "not built."** Split Claim's N per-expense requests do **not** visually group together in the recipient's Split Request inbox; each shows up as its own independent entry. No `splitBatchId`-style link exists in the data model. Revisit if grouped display is actually wanted — it would need that link added, since "same requester + same members + close timestamps" isn't being relied on to infer it today.
- **Atomicity of Split Claim — resolved as "no atomicity."** The frontend loops the existing per-expense endpoint once per expense, called from Save Claim's own success handler. A partial failure (e.g. expense 2 of 3 rejected server-side) does **not** roll back the ones that already succeeded — the employee sees a toast naming how many failed and has to reopen the claim to retry, with no automatic retry built in.
- **Deleting the two superseded endpoints** — `splitClaim.api.ts`/`splitExpense.api.ts` and their backend routes aren't called by any UI once this ships; whether to actually delete the backend routes (vs. leave them as dead, unreferenced code) is a backend/cleanup decision out of this doc's scope. Still unresolved — neither was touched by the deferred-submission work.
- **Retrying a partially-failed Split Claim** — new question, raised by the deferred-submission/loop-per-expense design: today, if some of a Split Claim's per-expense requests fail at Save Claim time, there's no dedicated "retry just the failed ones" action — the employee would have to re-stage and re-submit the whole Split Claim, which would attempt every expense again (harmless but redundant for the ones that already succeeded, since nothing currently prevents a second Split Request against an expense that already has one pending). Not addressed here; flagging for a future pass if partial failures turn out to be common in practice.
