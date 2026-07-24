import {
  CategoryApprovalLevel,
  CategoryApprovalStage,
  CategoryApprovalStageApprover,
  CategoryField,
  CategoryPolicy,
  CategoryPolicyEligibility,
  CategoryPolicyRule,
} from "../models";
import type { CategoryEligibilityType } from "../models/category-policy-eligibility.model";
import type { IncomingEligibility, IncomingPolicy } from "./category-policy-validation";

const LIST_LIKE_FIELD_TYPES = new Set(["list", "city_list", "dropdown"]);
const NUMERIC_FIELD_TYPES = new Set(["amount", "number"]);

export async function buildFieldLookups(categoryId: number) {
  const fields = await CategoryField.findAll({ where: { categoryId } });
  return {
    fieldsWithPolicyRules: new Set(fields.filter((field) => field.addToPolicyRules).map((field) => field.id)),
    listLikeFieldIds: new Set(fields.filter((field) => LIST_LIKE_FIELD_TYPES.has(field.fieldType)).map((field) => field.id)),
    numericFieldIds: new Set(fields.filter((field) => NUMERIC_FIELD_TYPES.has(field.fieldType)).map((field) => field.id)),
  };
}

// Full replace — nothing outside this category references CategoryPolicy
// ids, unlike CategoryField's, so destroy-then-recreate is safe here and
// matches 013's own documented API design for these save endpoints.
export async function persistPolicy(
  categoryId: number,
  policyType: "claim" | "exception" | "project",
  policy: IncomingPolicy,
  position: number
): Promise<void> {
  const created = await CategoryPolicy.create({
    categoryId,
    policyType,
    name: policy.name || `Policy ${String(position + 1).padStart(2, "0")}`,
    position,
  });

  const eligibilityRows = policy.eligibility
    .filter((entry): entry is IncomingEligibility & { eligibilityType: CategoryEligibilityType } => entry.eligibilityType !== null)
    .flatMap((entry) => entry.entityIds.map((entityId) => ({ policyId: created.id, eligibilityType: entry.eligibilityType, entityId })));
  if (eligibilityRows.length > 0) {
    await CategoryPolicyEligibility.bulkCreate(eligibilityRows);
  }

  if (policy.rules.length > 0) {
    await CategoryPolicyRule.bulkCreate(
      policy.rules.map((rule) => ({
        policyId: created.id,
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
      }))
    );
  }

  for (const level of policy.approvalLevels) {
    const createdLevel = await CategoryApprovalLevel.create({
      policyId: created.id,
      level: level.level,
      isDefaultFlow: level.isDefaultFlow,
      autoApprove: level.autoApprove,
    });
    for (const stage of level.stages) {
      const createdStage = await CategoryApprovalStage.create({ approvalLevelId: createdLevel.id, stageNumber: stage.stageNumber });
      const approverRows = stage.approverGroups.flatMap((group) =>
        group.employeeIds.map((employeeId) => ({ stageId: createdStage.id, employeeId, logicGroup: group.logicGroup }))
      );
      if (approverRows.length > 0) {
        await CategoryApprovalStageApprover.bulkCreate(approverRows);
      }
    }
  }
}
