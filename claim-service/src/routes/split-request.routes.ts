import { Router } from "express";
import { acceptSplitRequest, getSplitRequestDetail, listSplitRequests, rejectSplitRequest } from "../controllers/split-request.controller";
import { requireAuth } from "../middleware/require-auth";

export const splitRequestRouter = Router();

// 025's Split Claim inbox — same no-requireOwner posture as claimRouter,
// a split request belongs to the employees party to it, not to an admin.
splitRequestRouter.use(requireAuth);

splitRequestRouter.get("/", listSplitRequests);
splitRequestRouter.get("/:id", getSplitRequestDetail);
splitRequestRouter.post("/:id/accept", acceptSplitRequest);
splitRequestRouter.post("/:id/reject", rejectSplitRequest);
