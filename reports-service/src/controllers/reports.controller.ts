import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { fetchAllEmployees } from "../services/auth-service.client";
import { fetchAllCategories, fetchOrgClaims, fetchOrgExpenses, fetchOrgTrips } from "../services/claim-service.client";

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

// GET /api/reports/expense-summary?from=&to=&department=
// 028-reports.md's "Expense Summary by Category" — one row per *enabled*
// category (even ones with zero matching expenses, per that story's own
// "don't silently omit" rule), org-wide, for a date range.
export async function getExpenseSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const cookie = req.cookieHeader ?? "";
  const from = optionalString(req.query.from);
  const to = optionalString(req.query.to);
  const department = optionalString(req.query.department);

  const [categoriesResult, expensesResult, employees] = await Promise.all([
    fetchAllCategories(cookie),
    fetchOrgExpenses(cookie, { from, to }),
    // Only fetched when actually needed — the department join is the one
    // place this report has to cross into auth-service's data at all.
    department ? fetchAllEmployees(cookie) : Promise.resolve({ byId: new Map(), truncated: false }),
  ]);

  const relevantExpenses = department
    ? expensesResult.items.filter((expense) => {
        const employee = expense.employeeId ? employees.byId.get(expense.employeeId) : undefined;
        return employee?.department === department;
      })
    : expensesResult.items;

  const totalsByCategoryId = new Map<number, { count: number; totalAmount: number }>();
  for (const expense of relevantExpenses) {
    if (expense.categoryId === null) continue;
    const current = totalsByCategoryId.get(expense.categoryId) ?? { count: 0, totalAmount: 0 };
    current.count += 1;
    current.totalAmount += Number(expense.amount);
    totalsByCategoryId.set(expense.categoryId, current);
  }

  const rows = categoriesResult.items
    .filter((category) => category.isEnabled)
    .map((category) => {
      const totals = totalsByCategoryId.get(category.id) ?? { count: 0, totalAmount: 0 };
      return {
        categoryId: category.id,
        categoryName: category.name,
        expenseCount: totals.count,
        totalAmount: totals.totalAmount,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  res.status(200).json({ rows, truncated: categoriesResult.truncated || expensesResult.truncated || employees.truncated });
}

// GET /api/reports/claim-cost?from=&to=&status=
// 028-reports.md's "Claim Cost Report" — the Claim-side counterpart of Trip
// Cost below, same shape (a detail list, org-wide, `createdAt` date range +
// status filter, sorted by amount descending).
export async function getClaimCostReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const cookie = req.cookieHeader ?? "";
  const from = optionalString(req.query.from);
  const to = optionalString(req.query.to);
  const status = optionalString(req.query.status);

  const [claimsResult, employees] = await Promise.all([fetchOrgClaims(cookie, { from, to, status }), fetchAllEmployees(cookie)]);

  const rows = claimsResult.items
    .map((claim) => {
      const employee = employees.byId.get(claim.employeeId);
      return {
        claimId: claim.id,
        claimName: claim.name,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : null,
        claimType: claim.claimType,
        status: claim.status,
        createdAt: claim.createdAt,
        totalAmount: Number(claim.totalAmount),
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  res.status(200).json({ rows, truncated: claimsResult.truncated || employees.truncated });
}

// GET /api/reports/trip-cost?from=&to=&status=
// 028-reports.md's "Trip Cost Report" — a detail list (not aggregated),
// deliberately without Approved Amount/Variance (see that story's own note
// on why — the Approvals epic that would populate it is on hold).
export async function getTripCostReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const cookie = req.cookieHeader ?? "";
  const from = optionalString(req.query.from);
  const to = optionalString(req.query.to);
  const status = optionalString(req.query.status);

  const [tripsResult, employees] = await Promise.all([fetchOrgTrips(cookie, { from, to, status }), fetchAllEmployees(cookie)]);

  const rows = tripsResult.items
    .map((trip) => {
      const employee = employees.byId.get(trip.employeeId);
      return {
        tripId: trip.id,
        tripName: trip.name,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : null,
        status: trip.status,
        startAt: trip.startAt,
        endAt: trip.endAt,
        totalAmount: Number(trip.totalAmount),
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  res.status(200).json({ rows, truncated: tripsResult.truncated || employees.truncated });
}

// GET /api/reports/red-flagged-expenses?from=&to=
export async function getRedFlaggedExpensesReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  const cookie = req.cookieHeader ?? "";
  const from = optionalString(req.query.from);
  const to = optionalString(req.query.to);

  const [expensesResult, employees] = await Promise.all([
    fetchOrgExpenses(cookie, { from, to, isRedFlagged: "true" }),
    fetchAllEmployees(cookie),
  ]);

  const rows = expensesResult.items.map((expense) => {
    const employee = expense.employeeId ? employees.byId.get(expense.employeeId) : undefined;
    return {
      expenseId: expense.id,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : null,
      claimId: expense.claimId,
      claimName: expense.claimName,
      amount: Number(expense.amount),
      expenseDate: expense.expenseDate,
      redFlagReason: expense.redFlagReason,
    };
  });

  res.status(200).json({ rows, truncated: expensesResult.truncated || employees.truncated });
}
