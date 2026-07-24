import { Router } from "express";
import { getClaimCostReport, getExpenseSummary, getRedFlaggedExpensesReport, getTripCostReport } from "../controllers/reports.controller";
import { requireAuth } from "../middleware/require-auth";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get("/expense-summary", getExpenseSummary);
reportsRouter.get("/claim-cost", getClaimCostReport);
reportsRouter.get("/trip-cost", getTripCostReport);
reportsRouter.get("/red-flagged-expenses", getRedFlaggedExpensesReport);
