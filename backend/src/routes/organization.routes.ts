import { Router } from "express";
import { getGstAvailability, listMyOrganizations } from "../controllers/organization.controller";
import { requireAuth } from "../middleware/require-auth";

export const organizationRouter = Router();

organizationRouter.get("/gst-availability", getGstAvailability);
organizationRouter.get("/mine", requireAuth, listMyOrganizations);
