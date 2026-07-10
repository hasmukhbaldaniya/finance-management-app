import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategoryDetail,
  listCategories,
  listCategoryVersions,
  updateCategoryBasicDetails,
  updateCategoryEnabledStatus,
} from "../controllers/category.controller";
import { saveCategoryFields } from "../controllers/category-fields.controller";
import { saveCategoryPolicies } from "../controllers/category-policies.controller";
import { saveCategoryProjectPolicies } from "../controllers/category-project-policies.controller";
import {
  finishCategoryEditSession,
  getCategoryLatestVersion,
  getCategoryVersionDetail,
} from "../controllers/category-versions.controller";
import { requireAuth } from "../middleware/require-auth";

export const categoryRouter = Router();

// No requireOwner gate — any authenticated employee in the organization can
// create and fully manage any category (changed at explicit request from
// the original owner-only posture; categories are org-wide configuration,
// not any one employee's own record).
categoryRouter.use(requireAuth);

categoryRouter.get("/", listCategories);
categoryRouter.post("/", createCategory);
categoryRouter.get("/:id", getCategoryDetail);
categoryRouter.patch("/:id", updateCategoryBasicDetails);
categoryRouter.delete("/:id", deleteCategory);
categoryRouter.patch("/:id/status", updateCategoryEnabledStatus);
categoryRouter.put("/:id/fields", saveCategoryFields);
categoryRouter.put("/:id/policies", saveCategoryPolicies);
categoryRouter.put("/:id/project-policies", saveCategoryProjectPolicies);
categoryRouter.get("/:id/versions", listCategoryVersions);
categoryRouter.get("/:id/versions/latest", getCategoryLatestVersion);
categoryRouter.get("/:id/versions/:version", getCategoryVersionDetail);
categoryRouter.post("/:id/finish-editing", finishCategoryEditSession);
