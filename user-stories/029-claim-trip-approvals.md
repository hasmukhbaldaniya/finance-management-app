# 029 - Claim / Trip Approvals

**Status:** ON HOLD — do not implement. Deferred as its own separate story; not part of the current Reports (Phase 5) work. Everything below is captured context for whenever this resumes, not a build-ready spec.
**Epic:** Claim / Trip Approvals

## Overview

**This entire epic is parked.** [028-reports.md](./028-reports.md) has been explicitly scoped to have zero dependency on it. Nothing here should be built until this doc is picked back up and actually confirmed as ready.

Covers the "Approvals" nav destination (currently a bare `<ComingSoon title="..." />` at `frontend/src/app/(private)/approvals/page.tsx`, per [003-header-navigation.md](./003-header-navigation.md)) — a designated approver's queue of claims/trips pending their decision, and the approve/reject action itself. [006-roles-and-privileges-management.md](./006-roles-and-privileges-management.md) already names a `claim_trip_approvals` privilege, and [013-category-creation.md](./013-category-creation.md)'s "Policies and Approvals" wizard step already lets a Company Administrator **configure** multi-level, multi-approver approval chains per category (`CategoryApprovalLevel` → `CategoryApprovalStage` → `CategoryApprovalStageApprover`, AND/OR `logicGroup` semantics — see those models' own doc comments). **None of that configuration is connected to anything at runtime yet**: there is no code anywhere that reads a claim's category, walks its approval chain, records a decision, or advances a claim's status past `submitted`. This story is that missing runtime piece.

This would share its [Organization-Wide Read Access](./028-reports.md#prerequisite-organization-wide-read-access) prerequisite with [028-reports.md](./028-reports.md) if/when it resumes — an approver needs to see claims/trips that aren't their own, exactly like a report does.

**Would live in `claim-service`, not `reports-service`**: approving/rejecting is a write action against Claim/Trip state, which `claim-service` already owns; `reports-service` is deliberately read-only with no database of its own (`docs/PLANS/microservices-frontend-integration-plan.md` section 1.1's topology). Flagging this explicitly since both epics were scoped in the same conversation and could otherwise be assumed to live in the same new service.

## Tentative state machine (product owner's first-pass answers, 2026-07-24 — not final, captured for whenever this resumes)

- **Level resolution is simplified for v1**: ignore 013's per-project level variation entirely. Always resolve via the category's `CategoryApprovalLevel` where `isDefaultFlow: true`. The Approvals UI only ever needs to display which stage/level a claim is currently at (a number), not resolve which project-specific policy applies.
- **"Fully approved" is not the end of the line** — once every stage in the chain has a passing decision, the claim becomes **Finance's** responsibility, not Approvals'. Concretely: `Claim.status` → `ready_for_submission`, and it's removed from the Approvals grid. This is genuinely a new, third epic (**"Finance View"** — see [Out of Scope](#out-of-scope)), not just a report: Finance can act on a `ready_for_submission` claim, ultimately setting it to `approved_for_reimbursement` (or rejecting it — see next point). Until that epic exists, a claim reaching `ready_for_submission` has nowhere to be acted on next; flagging this as a real sequencing dependency, not just a naming one.
- **Rejection can happen at either stage** — an approval-chain approver can reject, and so can Finance. Same `rejected` status value either way (see [Validation Rules Summary](#validation-rules-summary) for how the two are distinguished for audit/reporting purposes without needing two enum values).
- **Trip flows through the same Approvals grid as Claim** — submitting a trip puts it in the Approvals queue exactly like submitting a claim does. **What's still unresolved**: `Trip` has no `categoryId`, so there's no `CategoryApprovalLevel`/`Stage`/`Approver` chain to walk for it — the product owner confirmed trips *appear* in the same grid, but not *who* approves them, since no per-category (or any) policy links to `Trip` today. See [Open Questions](#open-questions--assumptions) for the recommended default.

---

## Story: View Pending Approvals

**As an** approver (an employee named in some category's `CategoryApprovalStageApprover` rows)
**I want** a list of claims and trips currently waiting on my decision
**So that** I don't have to be told out-of-band which claims need my attention

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Approvals | Pending list | table: Type (Claim/Trip), Employee, Category (claims only), Amount, Submitted Date, Current Stage | — |

### Flow

1. New endpoint `GET /api/claims/pending-approval` (and a Trip equivalent — see Open Questions for who qualifies as a trip approver) resolves, for the calling employee: every claim with `status: "pending_for_approval"` whose *current* stage includes this employee as an eligible approver, plus every trip with an equivalent pending status.
2. "Current stage" resolution (**confirmed, v1 = default flow only**): a claim's `categoryId` → that category's `CategoryApprovalLevel` where `isDefaultFlow: true` (project-specific levels from 013's Step 4 are ignored for v1) → its `CategoryApprovalStage`s ordered by `stageNumber` → the first stage with no recorded passing decision yet (see the new tracking table below) → that stage's `CategoryApprovalStageApprover` rows, grouped by `logicGroup`.
3. The calling employee sees the claim in their queue if they appear in *any* `logicGroup` at the current stage that hasn't yet had one of its members approve (OR-within-group: any one approver in a group suffices).
4. The grid shows the current stage as a plain number ("Level 2 of 3") — no other level/policy detail needs surfacing here, per the product owner's simplification above.

### Validation Rules

None beyond authentication — this is a read endpoint.

### Acceptance Criteria

- **Given** a claim at stage 2 of a 3-stage chain, **when** an approver named only in stage 1 or stage 3 checks their queue, **then** the claim does not appear for them.
- **Given** a claim whose category has `autoApprove: true` on its active level, **when** it's submitted, **then** it never appears in anyone's queue at all — it should progress automatically (see the Approve/Reject story's Open Questions on where this auto-progression is actually triggered).

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| List fails to load | Generic `apiManager.ts` error message. |

---

## Story: Approve / Reject a Claim

**As an** approver
**I want** to approve or reject a claim at my stage, with an optional comment
**So that** the claim progresses toward reimbursement or is sent back

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Approvals > Claim Detail | Approve button | button | — |
| Approvals > Claim Detail | Reject button | button | — |
| Approvals > Claim Detail | Comment | textarea | **Open Question**: required on reject, optional on approve? Not specified anywhere yet. |

### Flow

1. `POST /api/claims/:id/approve` — records the calling employee's decision at the claim's current stage (new `ClaimApprovalDecision` table, see below). If this decision satisfies the stage's AND/OR requirement (every `logicGroup` at this stage now has at least one `approved` decision), advance to the next stage; if this was the last stage in the default-flow chain, set `Claim.status: "ready_for_submission"` and remove it from the Approvals grid — **confirmed**: this hands the claim off to Finance View (a new, separate epic — see Out of Scope), not straight to `approved_for_reimbursement`.
2. `POST /api/claims/:id/reject` — usable both here (an approval-chain approver rejecting) and from the future Finance View epic (Finance rejecting a `ready_for_submission` claim). **Confirmed: one `rejected` status value covers both** — add `"rejected"` to `CLAIM_STATUSES` (a migration + updating every place that already reads the enum, e.g. `028-reports.md`'s Claim Status report). To distinguish *which* stage rejected it (needed for the employee to know whether to fix and resubmit at Approvals or that Finance itself declined it) without a second enum value, the new `ClaimApprovalDecision` row recording the rejection carries a `stageType: "approval" | "finance"` — the claim's `status` alone is `rejected` either way, but the decision history disambiguates.
3. Trip: submitting a trip inserts it into the same Approvals grid as a claim (**confirmed**) — see Open Questions for the one remaining gap, who is actually eligible to approve it, since `Trip` has no `categoryId`/policy chain to resolve approvers from the way a claim does.

### Validation Rules

| Field | Rule |
|-------|------|
| Comment | Open Question below — length limit and required/optional not yet specified. |

### Acceptance Criteria

- **Given** a claim at the last stage of its default-flow chain, **when** the final required approval is recorded, **then** `Claim.status` becomes `ready_for_submission` and the claim no longer appears in anyone's Approvals grid.
- **Given** a claim rejected by an approval-chain approver, **when** the employee views it, **then** its status is `rejected` and the decision history shows `stageType: "approval"` (distinguishing it from a Finance-stage rejection once that epic exists).
- **Given** a category with `autoApprove: true` on its default-flow level, **when** a claim in that category is submitted, **then** it moves directly to the next stage (or to `ready_for_submission`, if it was the only stage) without appearing in any approver's grid at all.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Approve/reject on a claim no longer at the caller's stage (someone else in the same `logicGroup` already acted, or the claim moved on) | A specific, non-generic message — **Open Question**: exact wording not yet specified; should not silently succeed or show the generic error message, since this is a real, expected race condition (concurrent approvers) not a server fault. |

---

## Validation Rules Summary

| Field | Rule |
|-------|------|
| `Claim.status` | New value `"rejected"` added to `CLAIM_STATUSES` — requires a migration, and updating every existing reader of the enum (`028-reports.md`'s Claim Status/Aging report in particular, since it iterates the full status domain). |

## Out of Scope

- **Finance View** — now confirmed as a real, separate, actionable epic (not a report): the screen Finance uses to act on `ready_for_submission` claims, ultimately setting `approved_for_reimbursement` or `rejected`. Genuinely needed to complete this story's own state machine (a claim reaching `ready_for_submission` has nowhere to go without it) but scoping it is its own piece of work — recommend it as the very next thing to scope after this doc is confirmed.
- Trip approval's specific approver-resolution mechanism — confirmed that submitted trips *enter* the same grid as claims; *who* approves them is still open, see below.
- Notifying an approver that something's waiting on them (email/WhatsApp via `communications-service`, following the pattern `auth-service`'s employee-invite flow already uses) — a natural fast-follow, not in v1.
- Editing/reconfiguring an approval chain from this screen — that's [013-category-creation.md](./013-category-creation.md)'s Category wizard, unchanged by this story.
- Bulk approve/reject — v1 is one claim/trip at a time.

## Open Questions / Assumptions

Resolved by the product owner (2026-07-24) — see [The confirmed state machine](#the-confirmed-state-machine-product-owner-answers-2026-07-24) above:
- ~~Which approval level applies to a given claim~~ — v1 always uses the category's default-flow level, project-specific levels ignored.
- ~~What "all stages approved" transitions to~~ — `ready_for_submission`, then owned by the new Finance View epic.
- ~~Whether a new rejected status is needed~~ — yes, one `rejected` value, disambiguated via the decision-history's `stageType`.
- ~~Whether Trip participates in Approvals~~ — yes, submitting a trip enters the same grid as a claim.

Still open:
1. **Who is eligible to approve a submitted Trip?** No `categoryId`/policy chain exists on `Trip` to resolve approvers from. Recommended default to confirm: a simple, org-level (not per-category) approver list — e.g. every employee with `Employee.isOwner: true`, reusing the access-control mechanism already established for Reports, rather than inventing a new configuration surface just for this. Needs explicit confirmation before building, since it's a real product decision either way.
2. **Is a comment required on reject** (common pattern, so the employee knows why), **optional on approve**?
3. **Auto-approve categories (`autoApprove: true`)** — where does the automatic progression actually get triggered? On claim submission (synchronously, in the same request), or via some background process?
4. **Exact wording** for the "someone else already acted on this stage" race-condition error message.
