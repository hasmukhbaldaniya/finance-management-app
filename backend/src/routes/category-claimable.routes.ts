import { Router } from "express";
import { listClaimableCategories } from "../controllers/claim.controller";
import { requireAuth } from "../middleware/require-auth";

// Mounted at the same "/categories" prefix as categoryRouter, but
// registered before it in routes/index.ts — categoryRouter's own `.use`
// gates everything behind requireOwner, but any authenticated employee (not
// just an owner) needs this one read-only endpoint for the Claim expense
// form's Category dropdown (022's API Design).
export const categoryClaimableRouter = Router();

categoryClaimableRouter.use(requireAuth);
categoryClaimableRouter.get("/claimable", listClaimableCategories);
