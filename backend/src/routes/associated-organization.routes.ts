import { Router } from "express";
import {
  listAssociatedOrganizations,
  updateAssociatedOrganizationStatus,
} from "../controllers/associated-organization.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireOwner } from "../middleware/require-owner";

export const associatedOrganizationRouter = Router();

associatedOrganizationRouter.use(requireAuth, requireOwner);

associatedOrganizationRouter.get("/", listAssociatedOrganizations);
associatedOrganizationRouter.patch("/:id/status", updateAssociatedOrganizationStatus);
