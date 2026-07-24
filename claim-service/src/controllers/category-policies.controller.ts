import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Category, CategoryPolicy } from "../models";
import {
  findDuplicatePolicyName,
  parseIncomingPolicy,
  validatePolicy,
  type IncomingPolicy,
  type PolicyValidationOptions,
} from "../utils/category-policy-validation";
import { buildFieldLookups, persistPolicy } from "../utils/category-policy-persistence";
import { MAX_CLAIM_POLICIES, MAX_EXCEPTION_POLICIES } from "../utils/constants/category.constant";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const CATEGORY_NOT_FOUND_MESSAGE = "Category not found.";

export async function saveCategoryPolicies(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const category = await Category.findOne({ where: { id: Number(req.params.id), organizationId } });
  if (!category) {
    res.status(404).json({ error: CATEGORY_NOT_FOUND_MESSAGE });
    return;
  }

  const isDraftSave = req.body?.isDraftSave === true;
  const rawClaimPolicies = Array.isArray(req.body?.claimPolicies) ? req.body.claimPolicies : [];
  const rawExceptionPolicies = Array.isArray(req.body?.exceptionPolicies) ? req.body.exceptionPolicies : [];

  const claimPolicies = rawClaimPolicies.map(parseIncomingPolicy);
  const exceptionPolicies = rawExceptionPolicies.map(parseIncomingPolicy);
  if (claimPolicies.some((policy: IncomingPolicy | null) => policy === null) || exceptionPolicies.some((policy: IncomingPolicy | null) => policy === null)) {
    res.status(400).json({ error: "Invalid policy data." });
    return;
  }
  const validClaimPolicies = claimPolicies as IncomingPolicy[];
  const validExceptionPolicies = exceptionPolicies as IncomingPolicy[];

  if (validClaimPolicies.length < 1) {
    res.status(400).json({ error: "At least one claim policy is required." });
    return;
  }
  if (validClaimPolicies.length > MAX_CLAIM_POLICIES) {
    res.status(400).json({ error: `You've reached the maximum of ${MAX_CLAIM_POLICIES} claim policies.` });
    return;
  }
  if (validExceptionPolicies.length > MAX_EXCEPTION_POLICIES) {
    res.status(400).json({ error: `You've reached the maximum of ${MAX_EXCEPTION_POLICIES} exception policies.` });
    return;
  }

  const fieldLookups = await buildFieldLookups(category.id);

  const claimOptions: PolicyValidationOptions = {
    allowedEligibilityTypes: new Set(["department", "grade", "project"]),
    maxRuleLevel: Number.POSITIVE_INFINITY,
    checkRuleDuplicates: !isDraftSave,
    ...fieldLookups,
  };
  const exceptionOptions: PolicyValidationOptions = {
    allowedEligibilityTypes: new Set(["employee"]),
    maxRuleLevel: 1,
    checkRuleDuplicates: !isDraftSave,
    ...fieldLookups,
  };

  if (!isDraftSave) {
    const duplicateClaimName = findDuplicatePolicyName(validClaimPolicies);
    if (duplicateClaimName) {
      res.status(400).json({ error: duplicateClaimName });
      return;
    }
    const duplicateExceptionName = findDuplicatePolicyName(validExceptionPolicies);
    if (duplicateExceptionName) {
      res.status(400).json({ error: duplicateExceptionName });
      return;
    }
  }

  for (const policy of validClaimPolicies) {
    const error = validatePolicy(policy, claimOptions);
    if (error) {
      res.status(400).json({ error });
      return;
    }
  }
  for (const policy of validExceptionPolicies) {
    const error = validatePolicy(policy, exceptionOptions);
    if (error) {
      res.status(400).json({ error });
      return;
    }
  }

  // Full replace — nothing outside this category references CategoryPolicy
  // ids, unlike CategoryField's, so destroy-then-recreate is safe here and
  // matches 013's own documented API design for this endpoint.
  await CategoryPolicy.destroy({ where: { categoryId: category.id, policyType: ["claim", "exception"] } });

  let position = 0;
  for (const policy of validClaimPolicies) {
    await persistPolicy(category.id, "claim", policy, position++);
  }
  position = 0;
  for (const policy of validExceptionPolicies) {
    await persistPolicy(category.id, "exception", policy, position++);
  }

  category.updatedBy = req.userId;
  await category.save();

  res.status(200).json({ message: "Policies and approvals saved." });
}
