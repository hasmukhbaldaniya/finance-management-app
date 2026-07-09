import { MAX_APPROVAL_LEVEL, MAX_APPROVERS_PER_STAGE, MIN_APPROVAL_LEVEL, MIN_APPROVERS_PER_STAGE } from "./constants/category.constant";
import type { CategoryEligibilityType } from "../models/category-policy-eligibility.model";

const ELIGIBILITY_TYPES = new Set<string>(["department", "grade", "project", "employee"]);

function toEligibilityType(value: unknown): CategoryEligibilityType | null {
  return typeof value === "string" && ELIGIBILITY_TYPES.has(value) ? (value as CategoryEligibilityType) : null;
}

export type IncomingEligibility = { eligibilityType: CategoryEligibilityType | null; entityIds: number[] };
export type IncomingRule = {
  level: number;
  ruleType: "field_specific" | "combination";
  fieldId: number | null;
  operator: string | null;
  value: string | null;
  comparisonFieldId: number | null;
  comparisonValue: string | null;
  amountFieldId: number | null;
  amountOperator: string | null;
  amountValue: string | null;
};
export type IncomingApproverGroup = { logicGroup: number; employeeIds: number[] };
export type IncomingStage = { stageNumber: number; approverGroups: IncomingApproverGroup[] };
export type IncomingApprovalLevel = { level: number | null; isDefaultFlow: boolean; autoApprove: boolean; stages: IncomingStage[] };
export type IncomingPolicy = {
  id?: number;
  name: string;
  eligibility: IncomingEligibility[];
  rules: IncomingRule[];
  approvalLevels: IncomingApprovalLevel[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((entry): entry is number => typeof entry === "number") : [];
}

export function parseIncomingPolicy(raw: unknown): IncomingPolicy | null {
  if (!isPlainObject(raw)) return null;

  const eligibilityRaw = Array.isArray(raw.eligibility) ? raw.eligibility : [];
  const eligibility: IncomingEligibility[] = eligibilityRaw
    .filter(isPlainObject)
    .map((entry) => ({ eligibilityType: toEligibilityType(entry.eligibilityType), entityIds: toNumberArray(entry.entityIds) }));

  const rulesRaw = Array.isArray(raw.rules) ? raw.rules : [];
  const rules: IncomingRule[] = rulesRaw.filter(isPlainObject).map((entry) => ({
    level: typeof entry.level === "number" ? entry.level : 1,
    ruleType: entry.ruleType === "combination" ? "combination" : "field_specific",
    fieldId: typeof entry.fieldId === "number" ? entry.fieldId : null,
    operator: typeof entry.operator === "string" ? entry.operator : null,
    value: typeof entry.value === "string" ? entry.value : null,
    comparisonFieldId: typeof entry.comparisonFieldId === "number" ? entry.comparisonFieldId : null,
    comparisonValue: typeof entry.comparisonValue === "string" ? entry.comparisonValue : null,
    amountFieldId: typeof entry.amountFieldId === "number" ? entry.amountFieldId : null,
    amountOperator: typeof entry.amountOperator === "string" ? entry.amountOperator : null,
    amountValue: typeof entry.amountValue === "string" ? entry.amountValue : null,
  }));

  const levelsRaw = Array.isArray(raw.approvalLevels) ? raw.approvalLevels : [];
  const approvalLevels: IncomingApprovalLevel[] = levelsRaw.filter(isPlainObject).map((entry) => {
    const stagesRaw = Array.isArray(entry.stages) ? entry.stages : [];
    const stages: IncomingStage[] = stagesRaw.filter(isPlainObject).map((stage) => {
      const groupsRaw = Array.isArray(stage.approverGroups) ? stage.approverGroups : [];
      const approverGroups: IncomingApproverGroup[] = groupsRaw
        .filter(isPlainObject)
        .map((group) => ({ logicGroup: typeof group.logicGroup === "number" ? group.logicGroup : 0, employeeIds: toNumberArray(group.employeeIds) }));
      return { stageNumber: typeof stage.stageNumber === "number" ? stage.stageNumber : 1, approverGroups };
    });
    return {
      level: typeof entry.level === "number" ? entry.level : null,
      isDefaultFlow: entry.isDefaultFlow === true,
      autoApprove: entry.autoApprove === true,
      stages,
    };
  });

  return {
    id: typeof raw.id === "number" ? raw.id : undefined,
    name: typeof raw.name === "string" ? raw.name.trim() : "",
    eligibility,
    rules,
    approvalLevels,
  };
}

export type PolicyValidationOptions = {
  allowedEligibilityTypes: Set<string>;
  maxRuleLevel: number;
  checkRuleDuplicates: boolean;
  fieldsWithPolicyRules: Set<number>;
  listLikeFieldIds: Set<number>;
  numericFieldIds: Set<number>;
};

function stageApproverCount(stage: IncomingStage): number {
  return stage.approverGroups.reduce((total, group) => total + group.employeeIds.length, 0);
}

// Validates one policy's Eligibility/Rules/Approval Flows sections against
// user-stories/013-category-creation.md's rules — shared between Step 3
// (Claim/Exception) and Step 4 (Project), which differ only in which
// eligibility types are allowed and how many rule levels are permitted.
export function validatePolicy(policy: IncomingPolicy, options: PolicyValidationOptions): string | null {
  const hasEligibilityValue = policy.eligibility.some(
    (entry) => entry.eligibilityType !== null && options.allowedEligibilityTypes.has(entry.eligibilityType) && entry.entityIds.length > 0
  );
  if (!hasEligibilityValue) {
    if (options.allowedEligibilityTypes.size === 1) {
      if (options.allowedEligibilityTypes.has("employee")) return "At least one employee is required.";
      if (options.allowedEligibilityTypes.has("project")) return "At least one project is required.";
    }
    return "At least one value is required.";
  }

  const seenRuleKeys = new Set<string>();
  for (const rule of policy.rules) {
    if (rule.level < 1 || rule.level > options.maxRuleLevel) {
      return "This rule already exists at this level.";
    }
    if (rule.ruleType === "field_specific") {
      if (!rule.fieldId || !options.fieldsWithPolicyRules.has(rule.fieldId)) {
        return "Select a valid field for this rule.";
      }
    } else {
      if (!rule.comparisonFieldId || !options.listLikeFieldIds.has(rule.comparisonFieldId)) {
        return "Select a valid field for this rule.";
      }
      if (!rule.amountFieldId || !options.numericFieldIds.has(rule.amountFieldId)) {
        return "Select a valid field for this rule.";
      }
    }
    if (options.checkRuleDuplicates) {
      const key = JSON.stringify([
        rule.level,
        rule.ruleType,
        rule.fieldId,
        rule.operator,
        rule.value,
        rule.comparisonFieldId,
        rule.comparisonValue,
        rule.amountFieldId,
        rule.amountOperator,
        rule.amountValue,
      ]);
      if (seenRuleKeys.has(key)) {
        return "This rule already exists at this level.";
      }
      seenRuleKeys.add(key);
    }
  }

  const defaultFlows = policy.approvalLevels.filter((level) => level.isDefaultFlow);
  if (defaultFlows.length !== 1) {
    return "Exactly one Default Flow is required.";
  }
  const numberedLevels = policy.approvalLevels.filter((level) => !level.isDefaultFlow);
  const seenLevels = new Set<number>();
  for (const level of numberedLevels) {
    if (level.level === null || level.level < MIN_APPROVAL_LEVEL || level.level > MAX_APPROVAL_LEVEL) {
      return "Select a valid approval level.";
    }
    if (seenLevels.has(level.level)) {
      return "Each approval level can only be used once.";
    }
    seenLevels.add(level.level);
  }

  for (const level of policy.approvalLevels) {
    if (level.autoApprove) continue;
    if (level.stages.length === 0) {
      return "This field is required.";
    }
    for (const stage of level.stages) {
      const count = stageApproverCount(stage);
      if (count < MIN_APPROVERS_PER_STAGE || count > MAX_APPROVERS_PER_STAGE) {
        return "This field is required.";
      }
    }
  }

  return null;
}
