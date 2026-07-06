// Resolved per user-stories/008-employee-invitation.md's Open Questions: the
// source spec didn't enumerate the full module list, so this mirrors
// 003-header-navigation.md's existing top-level nav items.
export const MODULE_ACCESS_KEYS = ["trips", "claims", "approvals", "finance", "reports"] as const;
export type ModuleAccessKey = (typeof MODULE_ACCESS_KEYS)[number];

export function isValidModuleAccessKey(value: unknown): value is ModuleAccessKey {
  return typeof value === "string" && (MODULE_ACCESS_KEYS as readonly string[]).includes(value);
}

// ApprovalLevel.module is a per-module approval chain, but Step 4's UI only ever
// collects one shared Level 1/Level 2+ approver chain, not a chain per module —
// resolved by fanning that one chain out into one ApprovalLevel row per accessible
// module. If Module Access is empty, this sentinel value is used so the chain is
// still saved (approvers are collected regardless of module access, per the
// story's own flow) rather than silently discarded.
export const GENERAL_APPROVAL_MODULE = "general";
