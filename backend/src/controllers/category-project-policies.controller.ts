import type { Response } from "express";
import type { OwnerRequest } from "../middleware/require-owner";
import { Category, CategoryPolicy } from "../models";
import { parseIncomingPolicy, validatePolicy, type IncomingPolicy, type PolicyValidationOptions } from "../utils/category-policy-validation";
import { buildFieldLookups, persistPolicy } from "../utils/category-policy-persistence";
import { createCategoryVersion } from "../utils/category-versioning";
import { MAX_PROJECT_POLICIES } from "../utils/constants/category.constant";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const CATEGORY_NOT_FOUND_MESSAGE = "Category not found.";

// Step 4's save — per 013's API Design, this is confirmed as the terminal
// call: there's no separate submit/activate endpoint, so every successful
// call here (whether reached via the "Save as Draft" or "Submit" button)
// flips the category to "active".
export async function saveCategoryProjectPolicies(req: OwnerRequest, res: Response): Promise<void> {
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

  if (typeof req.body?.enableProjectPolicies !== "boolean") {
    res.status(400).json({ error: "Select whether to enable project-based policies." });
    return;
  }
  const enableProjectPolicies = req.body.enableProjectPolicies;
  const wasDraft = category.status === "draft";

  if (!enableProjectPolicies) {
    await CategoryPolicy.destroy({ where: { categoryId: category.id, policyType: "project" } });
    category.enableProjectPolicies = false;
    category.status = "active";
    category.updatedBy = req.userId;
    await category.save();
    // 016: Step 4's Submit is what creates 1.0 — the transition into having
    // versions at all, not an edit to an already-active category.
    if (wasDraft) {
      await createCategoryVersion(category, req.userId);
    }
    res.status(200).json({ message: "Category created and activated.", status: category.status });
    return;
  }

  const rawProjectPolicies = Array.isArray(req.body?.projectPolicies) ? req.body.projectPolicies : [];
  const projectPolicies = rawProjectPolicies.map(parseIncomingPolicy);
  if (projectPolicies.some((policy: IncomingPolicy | null) => policy === null)) {
    res.status(400).json({ error: "Invalid policy data." });
    return;
  }
  const validProjectPolicies = projectPolicies as IncomingPolicy[];

  if (validProjectPolicies.length < 1) {
    res.status(400).json({ error: "Add at least one project policy, or select No." });
    return;
  }
  if (validProjectPolicies.length > MAX_PROJECT_POLICIES) {
    res.status(400).json({ error: `You've reached the maximum of ${MAX_PROJECT_POLICIES} project policies.` });
    return;
  }

  const fieldLookups = await buildFieldLookups(category.id);
  const projectOptions: PolicyValidationOptions = {
    allowedEligibilityTypes: new Set(["project"]),
    maxRuleLevel: 1,
    checkRuleDuplicates: true,
    ...fieldLookups,
  };

  for (const policy of validProjectPolicies) {
    const error = validatePolicy(policy, projectOptions);
    if (error) {
      res.status(400).json({ error });
      return;
    }
  }

  await CategoryPolicy.destroy({ where: { categoryId: category.id, policyType: "project" } });
  let position = 0;
  for (const policy of validProjectPolicies) {
    await persistPolicy(category.id, "project", policy, position++);
  }

  category.enableProjectPolicies = true;
  category.status = "active";
  category.updatedBy = req.userId;
  await category.save();

  if (wasDraft) {
    await createCategoryVersion(category, req.userId);
  }

  res.status(200).json({ message: "Category created and activated.", status: category.status });
}
