import type { PrivilegeKey } from "./role.constant";

// Module Access (the Trips/Claims/Approvals/Finance/Reports checkbox group)
// was removed at explicit request after initial implementation — see
// user-stories/008-employee-invitation.md's Open Questions. ApprovalLevel.module
// still exists in the schema (dropping it would need a migration), so every
// approval row is now saved under this one fixed sentinel value instead of the
// per-module fan-out that used to happen when Module Access existed.
export const GENERAL_APPROVAL_MODULE = "general";

// The Level 1/2+ approver picker (GET /api/employees) is scoped to employees
// whose Role carries this privilege — see role.constant.ts's PRIVILEGE_KEYS.
// Company Admin has it by default; Members doesn't.
export const APPROVER_PRIVILEGE_KEY: PrivilegeKey = "claim_trip_approvals";
