import { Router } from "express";
import { getClaimCostReport, getExpenseSummary, getRedFlaggedExpensesReport, getTripCostReport } from "../controllers/reports.controller";

export const reportsRouter = Router();

reportsRouter.get("/expense-summary", getExpenseSummary);
reportsRouter.get("/claim-cost", getClaimCostReport);
reportsRouter.get("/trip-cost", getTripCostReport);
reportsRouter.get("/red-flagged-expenses", getRedFlaggedExpensesReport);
