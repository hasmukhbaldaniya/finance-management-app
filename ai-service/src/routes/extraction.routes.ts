import { Router } from "express";
import { extract } from "../controllers/extraction.controller";
import { requireInternalAuth } from "../middleware/require-internal-auth";

export const extractionRouter = Router();

extractionRouter.use(requireInternalAuth);
extractionRouter.post("/", extract);
