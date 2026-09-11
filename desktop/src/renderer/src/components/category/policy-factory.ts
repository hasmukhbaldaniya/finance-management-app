import type { CategoryPolicy } from "@/types/category.type";

function suggestPolicyName(existingNames: Set<string>): string {
  let index = 1;
  let candidate = `Policy ${String(index).padStart(2, "0")}`;
  while (existingNames.has(candidate.toLowerCase())) {
    index++;
    candidate = `Policy ${String(index).padStart(2, "0")}`;
  }
  return candidate;
}

// A brand-new policy always starts with exactly one Default Flow — see
// 013's Approval Flows section.
export function createBlankPolicy(existingNames: string[]): CategoryPolicy {
  return {
    name: suggestPolicyName(new Set(existingNames.map((name) => name.toLowerCase()))),
    eligibility: [],
    rules: [],
    approvalLevels: [{ level: null, isDefaultFlow: true, autoApprove: false, stages: [{ stageNumber: 1, approverGroups: [{ logicGroup: 0, employeeIds: [] }] }] }],
  };
}

export function duplicatePolicy(policy: CategoryPolicy, existingNames: string[]): CategoryPolicy {
  const lowerNames = new Set(existingNames.map((name) => name.toLowerCase()));
  let candidate = `${policy.name} Copy`;
  let index = 2;
  while (lowerNames.has(candidate.toLowerCase())) {
    candidate = `${policy.name} Copy ${index}`;
    index++;
  }
  return {
    name: candidate,
    eligibility: policy.eligibility.map((entry) => ({ ...entry, entityIds: [...entry.entityIds] })),
    rules: policy.rules.map((rule) => ({ ...rule })),
    approvalLevels: policy.approvalLevels.map((level) => ({
      ...level,
      stages: level.stages.map((stage) => ({ ...stage, approverGroups: stage.approverGroups.map((group) => ({ ...group, employeeIds: [...group.employeeIds] })) })),
    })),
  };
}
