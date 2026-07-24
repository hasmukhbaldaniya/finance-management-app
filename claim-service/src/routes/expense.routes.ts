import { Router } from "express";
import { listExpensesForOrg } from "../controllers/org-reports.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireOwner } from "../middleware/require-owner";

// New — there is no standalone expense listing anywhere else in this
// codebase (expenses are otherwise only ever read as a sub-resource of one
// claim, via GET /claims/:id). 028-reports.md's Red-Flagged Expenses report
// is the first thing that needs a cross-claim, org-wide view.
export const expenseRouter = Router();

expenseRouter.use(requireAuth);

expenseRouter.get("/org", requireOwner, listExpensesForOrg);
