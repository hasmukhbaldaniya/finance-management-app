# 025 - Split Claim: Sharing an Expense With Colleagues

**Status:** Draft
**Epic:** Claim Management

## Overview

**This is a different feature from what `022`/`024` currently call "Split Expense"/"Split Claim"/"Split Request" — read this section before touching any code.** Based on your reference screenshots, "Split Claim" means: an employee who paid a bill that covered more than just themselves (a team lunch, a shared cab, a group hotel room) can split that expense's cost across one or more **colleagues in the same organization**, each of whom gets notified by email, sees the request in their own "Split Request" inbox, and individually **accepts or rejects their share** — accepting raises a brand-new claim (or adds to an existing trip) in *their own* name for *their own* allocated portion. This is a cross-employee cost-sharing/request-response workflow, not a same-employee reorganization action.

**This directly collides, by name, with what's already shipped:**
- `022`'s existing **"Split an Expense"** story (divide one expense's Amount across 2+ *Category* portions, still on the same claim, same employee) is a different mechanic and can keep its name — no actual conflict, just a similar-sounding label.
- `022`'s existing **"Split a Claim"** story (move a subset of *your own* expenses onto a *brand-new claim you still own* — already implemented and shipped) is a genuine name collision. Based on these screenshots, "Split Claim" was always meant to describe *this* cross-employee request/response feature, not that one. **Recommendation: rename the already-shipped feature to something like "Move Expenses to a New Claim"** (code/API stay the same, just the UI label and this doc's own title change) so "Split Claim" is free to mean the feature below — flagged in [Open Questions](#open-questions--assumptions), not applied yet.
- `024`'s existing **"Split Request" tab** (a filtered view of claims *you* produced via the old Split a Claim action) needs to be **redefined** to mean what these screenshots show instead: an inbox of incoming cross-employee split requests directed *at* you. The old meaning is superseded by this doc.

None of the above renames/reworks are made in this doc — this is the story only, per your own instruction to write it first.

---

## Story: Request to Split an Expense With Colleagues

**As a** logged-in employee who paid for a shared expense
**I want to** ask one or more colleagues in my organization to each cover a share of it
**So that** I only claim reimbursement for my own portion, and they can claim theirs

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Expense panel (Manual or AI-Powered claim, alongside the existing "Split Expense" button) | "Split with Colleagues" button | button → opens the Split Request picker | — |
| Split Request picker | Colleague (repeated, add up to 9 more) | searchable single-select per row, same-organization employees only, excluding whoever's already added | Yes, at least 1 |
| Split Request picker | Split by | radio: "Percentage" / "Amount" | Yes |
| Split Request picker | Per-member allocation (including yourself) | number input (% or ₹, per "Split by") | Yes |
| Split Request picker | "Send Request" button | button | — |

### Flow

1. Reached from an already-filled-in expense (Category selected, Amount known) in either claim-creation flow — same greyed-out-until-ready posture as `022`'s own "Split Expense" button (disabled until Category and Amount are filled in).
2. The requester is included as a member by default (their own remaining share), and can add up to 9 colleagues from the same organization (10 members total, matching this epic's own expense/portion caps elsewhere) — searchable picker, same shape as `CategorySelect`/`TripSelect`'s own in-memory or server-backed search.
3. **Split by Percentage or Amount** — whichever is chosen, the other is computed automatically per member as they're entered; the picker shows a running "remaining to allocate" indicator (mirroring `022`'s own Split Expense remaining-amount UI) and blocks sending until percentages sum to exactly 100% (or amounts sum to exactly the original expense's Amount).
4. **Sending the request does not change the original expense yet** — it stays exactly as-is (full Amount, still on the requester's own claim) until each invited colleague actually responds; see [Story: Review and Respond](#story-review-and-respond-to-a-split-request) for what happens per response. This avoids the original claim's own numbers changing while responses are still pending (see [Open Questions](#open-questions--assumptions) on whether the requester's own share should auto-adjust once everyone has responded).
5. Each invited colleague (not the requester) gets an email notification and a new entry in their own "Split Request" tab (see next story).
6. The requester can see the live status of their own sent request (who's accepted/rejected/still pending) from their own claim's expense — exact placement left to implementation, e.g. a small status chip per member next to the "Split with Colleagues" button.

### Validation Rules

| Field | Rule |
|-------|------|
| Colleagues | 1–9, must belong to the requester's own organization, no duplicates, excludes the requester themselves (they're already an implicit member) |
| Allocation | Percentages sum to exactly 100%, or Amounts sum to exactly the expense's own Amount (exact match, no rounding leftover silently dropped) |

### Acceptance Criteria

- **Given** an expense with Amount ₹5,000 split 50/50 with one colleague, **when** the request is sent, **then** that colleague receives an email and sees a new "Split Request" entry; the requester's own expense is untouched at ₹5,000 until the colleague responds.
- **Given** percentages that don't sum to 100%, **when** "Send Request" is clicked, **then** it's blocked.
- **Given** an attempt to add a colleague from a different organization (bypassing the UI), **when** the request is submitted, **then** it's rejected server-side.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Allocation doesn't sum to 100%/the full amount | "Splits must add up to 100%." / "Splits must add up to the full expense amount." |
| No colleagues selected | "Add at least one colleague to split with." |
| Split request sent | "Split request sent." |

---

## Story: Split Request Inbox

**As a** logged-in employee
**I want to** see every expense-split request a colleague has sent me
**So that** I know what I still need to respond to

### Screens & Fields

| Screen | Field | Type | Notes |
|--------|-------|------|-------|
| My Claim | Tabs: "My Claim" / "Split Request" | tabs | Redefines `024`'s own tab — now an inbox of incoming requests, not a queue of your own split-off claims |
| Split Request (tab) | Search | text input, top-right | Matches the requester's name |
| Split Request (left filter rail) | Requested On | date picker | Exact-calendar-day match, same resolution every other date filter in this codebase uses |
| Split Request | Request card (repeated) | card | See fields below |

**Each request card shows** (per the reference screenshot):

| Field | Notes |
|-------|-------|
| "Split Request by: {requester name}" | The colleague who sent it |
| Requested On | Date + time, with a calendar icon |
| Requested Amount | **Your own allocated share**, not the original bill's full amount — ₹-icon chip |
| "Split Details" button | → the next story |

### Flow

1. Lists every split request where the logged-in employee is an invited member (not the requester), most recent first, infinite-scroll paginated — same pattern as every other listing in this codebase.
2. A request with multiple expenses bundled into it (see next story) still shows as one card here, with "Requested Amount" summing this employee's own share across every expense in that bundle.
3. Once every expense within a request has been responded to (by this employee), it drops off this inbox — see [Open Questions](#open-questions--assumptions) on whether responded-to requests should instead move to a "history" view rather than disappearing.

### Validation Rules

Not applicable — read-only listing.

### Acceptance Criteria

- **Given** a colleague sends a split request, **when** the invited employee opens "Split Request," **then** it appears with the requester's name, date, and this employee's own allocated amount.
- **Given** zero pending requests, **when** the tab is opened, **then** an empty state shows.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Failed to load | "Something went wrong. Please try again." |

---

## Story: Review and Respond to a Split Request

**As a** logged-in employee who's been asked to split an expense
**I want to** see the original bill's details and decide whether to accept my share
**So that** I only take on a cost I actually agree I owe, and can raise a claim for it right away if I accept

### Screens & Fields

| Screen | Field | Type | Required |
|--------|-------|------|----------|
| Split Details (`Split Request #{id}`) | "Requested by: {name}" | text | — |
| Split Details | Expense List (Category, Expense Amount, Status, Action) | table, one row per expense bundled into this request | — |
| Split Details | Per-row "View & Accept" / quick-reject (×) | buttons | — |
| Split Details | Page-level "Accept" / "Reject" | buttons, top-right | Bulk-apply to every still-pending row in this request |
| Split Details → Split Request modal | Member Name / Percentage / Amount (repeated) | read-only table | Every member of this split, including the responding employee ("(You)") |
| Split Request modal | Expense Form (read-only) | the original expense's own Category-driven fields, exactly as configured — Link to trip?, Claim Name, Category, total amount, and every category-specific field | — |
| Split Request modal | Claim Type* | radio: "Create New Claim" / "Link to Trip" | Yes, only on Accept |
| Split Request modal | Claim Name (Create New Claim) | text, pre-filled with the original expense's own claim/trip name, editable | Yes, if Create New Claim |
| Split Request modal | Trip (Link to Trip) | searchable dropdown, this employee's own `status: "new"` trips | Yes, if Link to Trip |
| Split Request modal | Cancel / Reject / "Accept Split Request" | buttons | — |

### Flow

1. **"Split Details"** (from the inbox card) opens a page listing every expense bundled into that one request, each with its own Status (`Pending Split Request` / `Accepted` / `Rejected`) — matches the reference screenshot's own wording exactly.
2. **"View & Accept"** on a row opens the detailed modal: the Member/Percentage/Amount breakdown for that one expense, the original bill's own read-only Expense Form (same dynamic Category-field rendering `022` already defines, just non-editable here), and a banner naming the requester and instructing the employee to review before responding.
3. **Accepting** requires choosing **Claim Type** first (same fork `022`'s own claim creation already uses) — this is what actually turns the employee's own share into a real claim: a new `Expense` is created (same Category as the original, `Amount` = this employee's own allocated share, `Paid By` defaulting to "Self Paid") on either a brand-new `Claim` (using the entered Claim Name) or added onto an existing trip-linked claim they choose. That new claim starts as a normal **Draft** — accepting a split doesn't skip straight to submission, the employee still reviews/completes it like any other claim before saving.
4. **Rejecting** (either the modal's own "Reject," the row's quick × icon, or the page-level bulk "Reject") marks that member's response as rejected and creates nothing — the requester is expected to see this reflected against their own original expense (exact surfacing left to implementation, e.g. a status chip per member).
5. **The page-level "Accept"/"Reject" buttons bulk-apply to every still-pending row** in the request — Accept uses a sensible default (a new standalone claim per expense, named after the original) without opening the per-row modal; Reject rejects everything at once. Reviewing/customizing Claim Type per expense always goes through "View & Accept" instead.
6. Once every member of a given expense's split has responded (accepted or rejected), that expense's own Status stops being "Pending Split Request."

### Validation Rules

| Rule | Detail |
|------|--------|
| Claim Type | Required before Accept can be confirmed |
| Responding twice | A member who already accepted/rejected can't respond again to the same expense (server-enforced, not just a disabled button) |
| Cross-organization | An employee can only ever see/respond to requests where they're an actual invited member — enforced the same way every other per-employee resource in this codebase already scopes by the caller's own id |

### Acceptance Criteria

- **Given** a pending split request for ₹2,500, **when** the invited employee clicks "View & Accept" and chooses "Create New Claim," **then** a new Draft claim is created in their own name with one Expense of Amount ₹2,500 in the same Category as the original bill.
- **Given** the same request, **when** the employee clicks Reject instead, **then** no claim is created and the row's Status reflects the rejection.
- **Given** a request already responded to, **when** the same employee tries to respond again (direct API call), **then** it's rejected, 409.

### Error / Toast Messages

| Scenario | Message |
|----------|---------|
| Accepted | "Split accepted — claim created." |
| Rejected | "Split rejected." |
| Missing Claim Type on Accept | "Select how you'd like to raise this claim." |
| Already responded | "You've already responded to this split." |

---

## Story: Split Request Email Notification

**As an** invited colleague
**I want** an email when someone asks me to split an expense with them
**So that** I notice it even if I'm not currently in the app

### Flow

1. Sending a split request (first story above) sends one email per invited colleague — same `nodemailer` infrastructure this codebase already uses for Employee Invite (`utils/employee-invite-mailer.ts`), not a new provider.
2. Email includes: who requested it, the bill's Category and this recipient's own allocated amount, and a link straight into their own "Split Request" inbox (`ROUTES` entry once implemented).

### Error / Toast Messages

Not applicable — a send failure here shouldn't block the split request itself from being created (matching this codebase's existing posture that email delivery is best-effort, not transactional with the underlying action it notifies about).

---

## API Design

| Method | Path | Body | Response (success) |
|--------|------|------|---------------------|
| POST | `/api/expenses/:expenseId/split-requests` | `{ splitType: "percentage" \| "amount", members: [{ employeeId, percentage?, amount? }] }` | `{ id }` |
| GET | `/api/split-requests` | `search`, `requestedOn`, `page`, `pageSize` | `{ requests: [...], hasMore }` — only requests where the caller is an invited member |
| GET | `/api/split-requests/:id` | — | Full request: requester, every bundled expense + that expense's own Category-field snapshot + this caller's own member row |
| POST | `/api/split-requests/:id/expenses/:splitExpenseId/accept` | `{ claimType, name?, tripId? }` | `{ newClaimId }` — 409 if already responded |
| POST | `/api/split-requests/:id/expenses/:splitExpenseId/reject` | — | `{ message }` — 409 if already responded |
| POST | `/api/split-requests/:id/accept-all` | `{}` (uses default Claim Type per expense) | `{ message }` |
| POST | `/api/split-requests/:id/reject-all` | — | `{ message }` |

Error responses follow the existing convention (`{ error: string }`): 400/401/404/409/500. No owner-gate — same posture as the rest of Claim Management, this is a personal action between employees, not admin configuration.

## Data Model

New tables:

- **`ExpenseSplitRequest`**: `id`, `expenseId` (FK → `Expense`, the original bill), `requestedByEmployeeId` (FK → `Employee`), `splitType` (`"percentage" | "amount"`), `createdAt`. One row per "send request" action — can bundle more than one original expense if the requester splits several bills with the same colleague set in one sitting (see [Open Questions](#open-questions--assumptions) on whether that's actually needed for v1, or whether one request = one expense is simpler and still matches the screenshots).
- **`ExpenseSplitRequestMember`**: `id`, `splitRequestId` (FK), `expenseId` (FK → `Expense`, which of the bundled original expenses this row is about), `employeeId` (FK → `Employee`, including the requester's own row for their retained share), `percentage`, `amount`, `status` (`"pending" | "accepted" | "rejected"`), `respondedAt` (nullable), `resultingExpenseId` (FK → `Expense`, nullable — set once accepted, pointing at the brand-new `Expense` created on the accepting employee's own claim).

No changes needed to `Expense`/`Claim` themselves beyond the new `resultingExpenseId` back-reference above — an accepted split just creates an ordinary new `Expense`/`Claim` row via the exact same creation path `022` already defines.

## Validation Rules Summary

See each story's own table above.

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| SC-01 | Split a ₹5,000 expense 50/50 with one colleague | Colleague gets an email + inbox entry; requester's own expense unchanged |
| SC-02 | Percentages summing to 90% | Send Request blocked |
| SC-03 | Colleague accepts, chooses Create New Claim | New Draft claim created in colleague's name, Amount = their share |
| SC-04 | Colleague accepts, chooses Link to Trip | New Expense added to the chosen trip-linked claim instead |
| SC-05 | Colleague rejects | No claim created, row Status reflects rejection |
| SC-06 | Colleague tries to respond twice (direct API call) | Rejected, 409 |
| SC-07 | Page-level bulk Accept with 3 pending rows | All 3 accepted with default Claim Type, 3 new claims created |
| SC-08 | Employee from a different organization attempts to view a request they're not a member of | 404 |

## Out of Scope

- What happens to the **requester's own** expense/claim once every invited colleague has responded (e.g. does their own Amount shrink to their retained share automatically?) — flagged in Open Questions, not decided here.
- Editing or cancelling a split request once sent (e.g. the requester changing their mind about who's included).
- Partial/rounding-remainder handling beyond "must sum exactly" — no automatic penny-rounding adjustment.
- Approval routing for the resulting new claims — same future story every other claim-creation path in this epic already defers this to.

## Open Questions / Assumptions

- **Does the requester's own expense amount reduce once colleagues accept?** Assumed no change for v1 (the requester's own claim keeps the full original Amount throughout) — but this risks double-reimbursement (both the requester and the accepting colleague separately claiming amounts that together exceed the original bill) unless a future story reconciles it. Flagging prominently rather than silently assuming either resolution is "obviously" correct.
- **Does the naming collision with `022`'s already-shipped "Split a Claim" and `024`'s "Split Request" tab get resolved by renaming the old feature, or some other way?** Recommended in the Overview above (rename the old one to "Move Expenses to a New Claim"); needs your confirmation before any code changes.
- **Can one split request bundle multiple original expenses**, or is it always exactly one expense per request (simpler, and still matches every reference screenshot, which only ever shows a single expense row)? Assumed "can bundle multiple" per the `ExpenseSplitRequest`/`ExpenseSplitRequestMember` split in the data model above, since the "Expense List" table in the Split Details screenshot is structured as a table (implying more than one row is possible) — but a v1 could reasonably start with exactly one expense per request and simplify the schema accordingly.
- **What happens to a request once all its members have responded** — does it disappear from the inbox entirely, or move to some kind of history/archive view? Assumed "disappears once fully responded" for v1.
- **Maximum number of colleagues per split** — assumed 9 (10 members total including the requester), mirroring this epic's existing 10-expense/10-file caps elsewhere, not confirmed against any specific business rule.
