import {
  Category,
  CategoryApprovalLevel,
  CategoryApprovalStage,
  CategoryApprovalStageApprover,
  CategoryField,
  CategoryPolicy,
  CategoryPolicyEligibility,
  CategoryPolicyRule,
  CategoryZiptrripMapping,
} from "../models";

export type ApprovalStageSnapshot = {
  stageNumber: number;
  approverGroups: { logicGroup: number; employeeIds: number[] }[];
};

export type ApprovalLevelSnapshot = {
  level: number | null;
  isDefaultFlow: boolean;
  autoApprove: boolean;
  stages: ApprovalStageSnapshot[];
};

export type PolicyEligibilitySnapshot = { eligibilityType: string; entityIds: number[] };

export type PolicyRuleSnapshot = {
  level: number;
  ruleType: string;
  fieldId: number | null;
  operator: string | null;
  value: string | null;
  comparisonFieldId: number | null;
  comparisonValue: string | null;
  amountFieldId: number | null;
  amountOperator: string | null;
  amountValue: string | null;
};

export type PolicySnapshot = {
  id: number;
  policyType: string;
  name: string;
  position: number;
  eligibility: PolicyEligibilitySnapshot[];
  rules: PolicyRuleSnapshot[];
  approvalLevels: ApprovalLevelSnapshot[];
};

export type FieldSnapshot = {
  id: number;
  fieldType: string;
  fieldName: string;
  tooltip: string | null;
  isRequired: boolean;
  addToPolicyRules: boolean;
  position: number;
  config: Record<string, unknown>;
  conditionalVisibility: { dependsOnFieldId: number; equalsValue: string } | null;
  redFlagMode: string | null;
  redFlagValue: string | null;
  redFlagAction: string | null;
};

export type CategorySnapshot = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  isEnabled: boolean;
  enableProjectPolicies: boolean;
  ziptrripCategoryKeys: string[];
  fields: FieldSnapshot[];
  claimPolicies: PolicySnapshot[];
  exceptionPolicies: PolicySnapshot[];
  projectPolicies: PolicySnapshot[];
};

async function buildPolicySnapshots(categoryId: number, policyType: "claim" | "exception" | "project"): Promise<PolicySnapshot[]> {
  const policies = await CategoryPolicy.findAll({ where: { categoryId, policyType }, order: [["position", "ASC"]] });
  if (policies.length === 0) return [];

  const policyIds = policies.map((policy) => policy.id);
  const [eligibilities, rules, approvalLevels] = await Promise.all([
    CategoryPolicyEligibility.findAll({ where: { policyId: policyIds } }),
    CategoryPolicyRule.findAll({ where: { policyId: policyIds }, order: [["level", "ASC"]] }),
    CategoryApprovalLevel.findAll({ where: { policyId: policyIds } }),
  ]);

  const levelIds = approvalLevels.map((level) => level.id);
  const stages = levelIds.length > 0 ? await CategoryApprovalStage.findAll({ where: { approvalLevelId: levelIds }, order: [["stageNumber", "ASC"]] }) : [];
  const stageIds = stages.map((stage) => stage.id);
  const approvers = stageIds.length > 0 ? await CategoryApprovalStageApprover.findAll({ where: { stageId: stageIds } }) : [];

  return policies.map((policy) => {
    const policyEligibilities = eligibilities.filter((row) => row.policyId === policy.id);
    const eligibilityByType = new Map<string, number[]>();
    policyEligibilities.forEach((row) => {
      const existing = eligibilityByType.get(row.eligibilityType) ?? [];
      existing.push(row.entityId);
      eligibilityByType.set(row.eligibilityType, existing);
    });

    const policyRules = rules
      .filter((rule) => rule.policyId === policy.id)
      .map((rule) => ({
        level: rule.level,
        ruleType: rule.ruleType,
        fieldId: rule.fieldId,
        operator: rule.operator,
        value: rule.value,
        comparisonFieldId: rule.comparisonFieldId,
        comparisonValue: rule.comparisonValue,
        amountFieldId: rule.amountFieldId,
        amountOperator: rule.amountOperator,
        amountValue: rule.amountValue,
      }));

    const policyLevels = approvalLevels.filter((level) => level.policyId === policy.id);
    const policyApprovalLevels: ApprovalLevelSnapshot[] = policyLevels.map((level) => {
      const levelStages = stages.filter((stage) => stage.approvalLevelId === level.id);
      const stageSnapshots: ApprovalStageSnapshot[] = levelStages.map((stage) => {
        const stageApprovers = approvers.filter((approver) => approver.stageId === stage.id);
        const groupMap = new Map<number, number[]>();
        stageApprovers.forEach((approver) => {
          const existing = groupMap.get(approver.logicGroup) ?? [];
          existing.push(approver.employeeId);
          groupMap.set(approver.logicGroup, existing);
        });
        return {
          stageNumber: stage.stageNumber,
          approverGroups: Array.from(groupMap.entries()).map(([logicGroup, employeeIds]) => ({ logicGroup, employeeIds })),
        };
      });
      return { level: level.level, isDefaultFlow: level.isDefaultFlow, autoApprove: level.autoApprove, stages: stageSnapshots };
    });

    return {
      id: policy.id,
      policyType: policy.policyType,
      name: policy.name,
      position: policy.position,
      eligibility: Array.from(eligibilityByType.entries()).map(([eligibilityType, entityIds]) => ({ eligibilityType, entityIds })),
      rules: policyRules,
      approvalLevels: policyApprovalLevels,
    };
  });
}

// The one shared "assemble everything about this category" builder — used by
// GET /api/categories/:id (013's shared detail endpoint every wizard step
// reads from) and by 016's version-creation snapshotting, so both read paths
// can never drift apart in shape.
export async function buildCategorySnapshot(category: Category): Promise<CategorySnapshot> {
  const [mappings, fields, claimPolicies, exceptionPolicies, projectPolicies] = await Promise.all([
    CategoryZiptrripMapping.findAll({ where: { categoryId: category.id } }),
    CategoryField.findAll({ where: { categoryId: category.id }, order: [["position", "ASC"]] }),
    buildPolicySnapshots(category.id, "claim"),
    buildPolicySnapshots(category.id, "exception"),
    buildPolicySnapshots(category.id, "project"),
  ]);

  return {
    id: category.id,
    name: category.name,
    description: category.description,
    status: category.status,
    isEnabled: category.isEnabled,
    enableProjectPolicies: category.enableProjectPolicies,
    ziptrripCategoryKeys: mappings.map((mapping) => mapping.ziptrripCategoryKey),
    fields: fields.map((field) => ({
      id: field.id,
      fieldType: field.fieldType,
      fieldName: field.fieldName,
      tooltip: field.tooltip,
      isRequired: field.isRequired,
      addToPolicyRules: field.addToPolicyRules,
      position: field.position,
      config: field.config,
      conditionalVisibility: field.conditionalVisibility,
      redFlagMode: field.redFlagMode,
      redFlagValue: field.redFlagValue,
      redFlagAction: field.redFlagAction,
    })),
    claimPolicies,
    exceptionPolicies,
    projectPolicies,
  };
}
