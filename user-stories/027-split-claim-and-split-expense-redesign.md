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

---

## Story: Split Expense — Share One Expense With Colleagues

**As a** logged-in employee entering a shared expense
**I want to** split just this one expense's cost across colleagues in my organization, by percentage
**So that** I only claim reimbursement for my own share, and they can claim theirs

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Expense panel (Manual or AI-Powered claim) | "Split Expense" button | button → opens the Split Expense dialog | — |
| Split Expense dialog | Split Among | searchable multi-select combobox, same-organization employees only, max 10 total including the requester | Yes, at least 1 (the requester alone counts) |
| Split Expense dialog | Member Name / Percentage / Amount (repeated, one row per selected member, requester always included and always first) | Percentage: number input; Amount: number input — both directly editable, each recalculates the other for that row | Yes, every row's Percentage > 0 |
| Split Expense dialog | Total Amount (footer) | read-only, sum of every row's Amount | — |
| Split Expense dialog | Cancel / "Yes, Submit" | buttons | — |

### Flow

1. Reached from the expense panel's "Split Expense" button — **disabled until every required field on that expense is filled** (not just Category + Amount as today's gate does — Category, Receipt/Invoice, Expense Date, Vendor Name, Amount, Paid By, and any other category-specific required field per that Category's own configuration).
2. Opening the dialog defaults "Split Among" to just the requester, at 100%.
3. **Adding or removing a member re-distributes Percentage evenly across every currently-selected member** (not "new member starts at 0%"): `base = floor(100 / memberCount)`, remainder = `100 - base × memberCount`, and the remainder is added one point at a time starting from the requester's own row until it's used up. E.g. 3 members → 34/33/33 (requester gets the extra point); 2 members → 50/50. This matches the reference screenshots exactly (a lone member always resets to 100%; adding two colleagues to make 3 total produces 34/33/33, not 100/0/0).
4. After the auto-redistribution, **both Percentage and Amount stay directly editable per row**: hand-editing a row's Percentage recalculates that row's Amount (`Percentage × the expense's own Amount field`, rounded to 2 decimals); hand-editing a row's Amount recalculates that row's Percentage (`Amount ÷ the expense's own Amount field × 100`). Editing one row never auto-rebalances any other row — the employee adjusts each row manually, same as `025`'s existing behavior, just now from either column.
5. **"Yes, Submit" stays disabled until Percentages sum to exactly 100%** (equivalently, since the two columns are kept in sync per row, Amounts sum to exactly the expense's Amount). Summing to less than 100%, or more than 100%, both keep it disabled — there's no "leave an unsplit remainder for yourself" mode.
6. Submitting sends one Split Request per invited colleague (excluding the requester's own retained row), reusing `025`'s existing "Request to Split an Expense With Colleagues" story unchanged from here on — colleagues get an email + Split Request inbox entry and must individually Accept/Reject; the requester's own expense is untouched until they do.

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
- **Given** a valid 100%-summing split across 2 colleagues, **when** "Yes, Submit" is clicked, **then** both colleagues receive an email + Split Request inbox entry, and the requester's own expense is unchanged until they respond (per `025`).

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Sum ≠ 100% on submit attempt (defensive, since the button should already be disabled) | "Splits must add up to 100%." |
| Split request sent | "Split request sent." |

---

## Story: Split Claim — Share Every Expense in This Claim With Colleagues

**As a** logged-in employee with multiple expenses on one claim
**I want to** split every expense on the claim across the same colleagues by percentage, in one action
**So that** I don't have to repeat "Split Expense" once per line item

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Claim-level header (Manual or AI-Powered claim), next to "Add Expense" | "Split Claim" button | button → opens the Split Claim dialog | — |
| Split Claim dialog | Info banner: "All expenses listed here will be split with the selected team members" | static text | — |
| Split Claim dialog | Split Among | same searchable multi-select as Split Expense | Yes, at least 1 |
| Split Claim dialog | Member Name / Percentage / Amount (repeated) | same as Split Expense — both directly editable per row, computed against the **claim's total** instead of one expense's Amount | Yes |
| Split Claim dialog | Total Amount (footer) | read-only, sum of every expense's own Amount across the whole claim | — |
| Split Claim dialog | Cancel / "Yes, Submit" | buttons | — |

### Flow

1. "Split Claim" is **disabled until every expense currently on the claim has all of its own required fields filled** — a claim with even one incomplete expense can't be split yet (see [Open Questions](#open-questions--assumptions) — this is the stricter of two reasonable readings and needs confirming).
2. Total Amount = the sum of every expense's own Amount field on the claim (confirmed against the reference screenshots: a claim with one ₹1,000 expense and one ₹3,332 expense shows a Split Claim Total Amount of ₹4,332.00).
3. Same member-selection, even-redistribution, and post-redistribution hand-editing mechanic as Split Expense (both Percentage and Amount stay directly editable per row), just computed against the claim's combined total instead of one expense's Amount.
4. **On submit, the chosen percentages (not the claim-level Amounts) are applied independently to every expense on the claim** — this is really "run Split Expense once per expense, using the same colleague set and percentages each time," not one lump-sum split detached from Category. A claim with 2 expenses and 1 invited colleague at 30% produces two separate Split Requests (one per original expense), each reflecting that expense's own Category and 30% of that expense's own Amount — the per-expense Amounts are derived from the shared Percentage at submit time, they aren't taken from the claim-level Amount column directly.
5. Each resulting Split Request still goes through `025`'s existing per-expense Accept/Reject flow unchanged. Multiple Split Requests created by the same "Split Claim" action are shown grouped together in the recipient's inbox (one card, "N expenses"), consistent with `025`'s own Split Details screen already being built around a per-request **list** of bundled expenses — but each expense inside that bundle is still individually Accept/Reject-able (accepting one doesn't force accepting all).

### Validation Rules

Same shape as Split Expense's table above, applied at the claim level:

| Field | Rule |
|-------|------|
| Split Among | 1–10 members total, same organization, no duplicates |
| Percentage | Sum across all members must equal exactly 100. Directly editable per row (recalculates that row's Amount against the claim's total). |
| Amount | Sum across all members must equal exactly the claim's total. Directly editable per row (recalculates that row's Percentage). |
| "Split Claim" button (trigger) | Disabled until every expense on the claim has all of its own required fields filled |

### Acceptance Criteria

- **Given** a claim with 2 expenses (₹1,000 and ₹3,332) and one colleague added at 50/50, **when** "Yes, Submit" is clicked, **then** 2 separate Split Requests are created — one for each original expense, each split 50/50 between the requester and that colleague, each keeping its own original Category.
- **Given** a claim where the 2nd expense hasn't had its required fields filled in yet, **when** the employee looks at the claim header, **then** "Split Claim" renders disabled.
- **Given** the same 2-expense claim, **when** the colleague accepts only the ₹1,000 expense's Split Request and rejects the other, **then** they end up with exactly one new Draft claim (for the accepted expense only) — the rejected one creates nothing.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Sum ≠ 100% on submit attempt | "Splits must add up to 100%." |
| Split requests sent | "Split requests sent for N expenses." |

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

## API Design

Reuses `025`'s existing per-expense endpoint for both flows — Split Claim is implemented as the frontend calling it once per expense on the claim, not a new bulk endpoint, **unless** atomicity (all-or-nothing across every expense) turns out to matter, in which case a wrapping bulk endpoint is worth adding (see [Open Questions](#open-questions--assumptions)):

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| POST | `/api/expenses/:expenseId/split-requests` | `{ splitType: "percentage", members: [{ employeeId, percentage }] }` (unchanged from `025`) | `{ id }` |
| *(optional, if atomicity is required)* POST | `/api/claims/:claimId/split-requests` | `{ splitType: "percentage", members: [{ employeeId, percentage }] }` | `{ ids: number[] }` — one id per expense on the claim |

**Removed** (no longer called from the frontend, since the features they backed are being removed):
- `POST /api/claims/:claimId/split` (`splitClaim.api.ts` — the old "Move to New Claim")
- `POST /api/claims/:claimId/expenses/:expenseId/split` (`splitExpense.api.ts` — the old Category/Amount-portions split)

Whether to also delete these two endpoints/routes server-side, or just stop calling them from the frontend, is a backend decision out of this doc's own scope — flagged in Open Questions.

## Data Model

No new tables beyond what `025` already defines (`ExpenseSplitRequest`, `ExpenseSplitRequestMember`) — Split Claim just creates multiple `ExpenseSplitRequest` rows (one per expense) in one action. If grouped-inbox display (showing all of one "Split Claim" action's requests together as "N expenses") needs an explicit link rather than being inferred from "same requester + same members + created within the same second," a nullable `splitBatchId` on `ExpenseSplitRequest` would be the minimal addition — flagged as an open question rather than assumed.

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| SC-01 | Split Expense with 1 member (requester only) | Percentage auto-fills to 100%, Submit stays disabled (no colleague to send to) — or is a self-only "split" simply a no-op that shouldn't be reachable? See Open Questions |
| SC-02 | Add a 2nd, then 3rd colleague to Split Expense | Percentages recompute to 50/50, then 34/33/33 |
| SC-03 | Hand-edit one member's percentage after auto-redistribution | That row's Amount recalculates to match; other rows stay as they were, no auto-rebalance |
| SC-03b | Hand-edit one member's Amount after auto-redistribution | That row's Percentage recalculates to match; other rows stay as they were, no auto-rebalance |
| SC-04 | Percentages summing to 99% | Submit disabled |
| SC-05 | Percentages summing to 101% | Submit disabled |
| SC-06 | Expense missing a required field | "Split Expense" button renders disabled |
| SC-07 | Claim with one incomplete expense | "Split Claim" button renders disabled |
| SC-08 | Split Claim across 2 expenses, 1 colleague at 40% | 2 Split Requests created, one per expense, each 40% of that expense's own Amount, correct Category preserved per request |
| SC-09 | Colleague accepts one bundled request but rejects the other | Exactly one new Draft claim created, for the accepted expense only |
| SC-10 | Attempt to add a colleague from a different organization (bypassing the UI) | Rejected server-side, same as `025`'s existing rule |
| SC-11 | Old "Move to New Claim" / old category-portions "Split Expense" UI | No longer reachable anywhere in either claim-creation flow |

## Out of Scope

- Anything about **how an accepted split's resulting claim looks or behaves** once created — unchanged from `025`, not re-specified here.
- Editing or cancelling a Split Claim/Split Expense action once submitted.
- Rounding-remainder reconciliation beyond "percentages must sum to exactly 100" — if per-member Amount rounding (₹ to 2 decimals) doesn't sum to the exact expense Amount to the paisa, this doc doesn't specify which member absorbs the difference (see Open Questions).
- Whether the two removed endpoints (`splitClaim.api.ts`/`splitExpense.api.ts`'s backend routes) are deleted server-side or just orphaned.

## Open Questions / Assumptions

- **Split Claim's trigger gate** — assumed "every expense on the claim must have all its required fields filled" (the stricter reading) rather than "at least one complete expense is enough, incomplete ones are simply excluded from the split." The stricter reading avoids ambiguity about what happens to an incomplete expense's own share, but needs confirming — it may be too strict for a claim where one expense is still mid-edit.
- **Self-only split (SC-01)** — if only the requester is selected (no colleagues added), is "Split Expense"/"Split Claim" simply not reachable in a meaningful way (100% pre-filled, nothing to submit since there's no one to request from), or should Submit itself be disabled until at least one colleague beyond the requester is added? Assumed the latter (at least 1 colleague required, not just the requester alone) but not explicitly confirmed.
- **Rounding remainder** — if 3 members split ₹1,000 at 34/33/33%, the derived Amounts (₹340/₹330/₹330) sum exactly here, but not every Amount will divide evenly. Assumed the UI silently accepts whatever rounding produces without forcing an exact-to-the-paisa reconciliation (matching `025`'s own "no automatic penny-rounding adjustment" stance) — flagging in case that's not acceptable for a percentage-sum-must-be-exact rule.
- **Bundled inbox grouping** — assumed Split Claim's N per-expense requests should visually group together in the recipient's Split Request inbox as "N expenses" under one card (reusing `025`'s own Split Details page, which is already structured as a list of expenses per request) — needs a `splitBatchId`-style link if "same requester + same members, same timestamp" isn't reliable enough to infer the grouping. Not confirmed which of these two implementations is preferred.
- **Atomicity of Split Claim** — assumed the frontend simply loops the existing per-expense endpoint once per expense (simplest, reuses `025`'s backend as-is). If a partial failure (e.g. expense 2 of 3 fails validation server-side) needs to roll back the whole action rather than leave a partial split in place, a dedicated bulk endpoint is worth adding instead — not decided here.
- **Deleting the two superseded endpoints** — `splitClaim.api.ts`/`splitExpense.api.ts` and their backend routes aren't called by any UI once this ships; whether to actually delete the backend routes (vs. leave them as dead, unreferenced code) is a backend/cleanup decision out of this doc's scope.
