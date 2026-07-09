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
import { requireOwner } from "../middleware/require-owner";

export const categoryRouter = Router();

categoryRouter.use(requireAuth, requireOwner);

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
