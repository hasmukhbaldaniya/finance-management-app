import { Router } from "express";
import { getGstAvailability } from "../controllers/organization.controller";

export const organizationRouter = Router();

organizationRouter.get("/gst-availability", getGstAvailability);
