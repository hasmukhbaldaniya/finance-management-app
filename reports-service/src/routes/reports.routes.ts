import { Router } from "express";
import { getExpenseSummary, getRedFlaggedExpensesReport, getTripCostReport } from "../controllers/reports.controller";

export const reportsRouter = Router();

reportsRouter.get("/expense-summary", getExpenseSummary);
reportsRouter.get("/trip-cost", getTripCostReport);
reportsRouter.get("/red-flagged-expenses", getRedFlaggedExpensesReport);
