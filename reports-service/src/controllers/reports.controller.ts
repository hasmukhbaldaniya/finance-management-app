import type { Request, Response } from "express";
import { fetchAllEmployees } from "../services/auth-service.client";
import { fetchAllCategories, fetchOrgClaims, fetchOrgExpenses, fetchOrgTrips } from "../services/claim-service.client";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";

function getCookie(req: Request): string | null {
  const cookie = req.headers.cookie;
  return typeof cookie === "string" && cookie ? cookie : null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

// GET /api/reports/expense-summary?from=&to=&department=
// 028-reports.md's "Expense Summary by Category" — one row per *enabled*
// category (even ones with zero matching expenses, per that story's own
// "don't silently omit" rule), org-wide, for a date range.
export async function getExpenseSummary(req: Request, res: Response): Promise<void> {
  const cookie = getCookie(req);
  if (!cookie) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const from = optionalString(req.query.from);
  const to = optionalString(req.query.to);
  const department = optionalString(req.query.department);

  const [categories, expenses, employeesById] = await Promise.all([
    fetchAllCategories(cookie),
    fetchOrgExpenses(cookie, { from, to }),
    // Only fetched when actually needed — the department join is the one
    // place this report has to cross into auth-service's data at all.
    department ? fetchAllEmployees(cookie) : Promise.resolve(new Map()),
  ]);

  const relevantExpenses = department
    ? expenses.filter((expense) => {
        const employee = expense.employeeId ? employeesById.get(expense.employeeId) : undefined;
        return employee?.department === department;
      })
    : expenses;

  const totalsByCategoryId = new Map<number, { count: number; totalAmount: number }>();
  for (const expense of relevantExpenses) {
    if (expense.categoryId === null) continue;
    const current = totalsByCategoryId.get(expense.categoryId) ?? { count: 0, totalAmount: 0 };
    current.count += 1;
    current.totalAmount += Number(expense.amount);
    totalsByCategoryId.set(expense.categoryId, current);
  }

  const rows = categories
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

  res.status(200).json({ rows });
}

// GET /api/reports/claim-cost?from=&to=&status=
// 028-reports.md's "Claim Cost Report" — the Claim-side counterpart of Trip
// Cost below, same shape (a detail list, org-wide, `createdAt` date range +
// status filter, sorted by amount descending).
export async function getClaimCostReport(req: Request, res: Response): Promise<void> {
  const cookie = getCookie(req);
  if (!cookie) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const from = optionalString(req.query.from);
  const to = optionalString(req.query.to);
  const status = optionalString(req.query.status);

  const [claims, employeesById] = await Promise.all([fetchOrgClaims(cookie, { from, to, status }), fetchAllEmployees(cookie)]);

  const rows = claims
    .map((claim) => {
      const employee = employeesById.get(claim.employeeId);
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

  res.status(200).json({ rows });
}

// GET /api/reports/trip-cost?from=&to=&status=
// 028-reports.md's "Trip Cost Report" — a detail list (not aggregated),
// deliberately without Approved Amount/Variance (see that story's own note
// on why — the Approvals epic that would populate it is on hold).
export async function getTripCostReport(req: Request, res: Response): Promise<void> {
  const cookie = getCookie(req);
  if (!cookie) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const from = optionalString(req.query.from);
  const to = optionalString(req.query.to);
  const status = optionalString(req.query.status);

  const [trips, employeesById] = await Promise.all([fetchOrgTrips(cookie, { from, to, status }), fetchAllEmployees(cookie)]);

  const rows = trips
    .map((trip) => {
      const employee = employeesById.get(trip.employeeId);
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

  res.status(200).json({ rows });
}

// GET /api/reports/red-flagged-expenses?from=&to=
export async function getRedFlaggedExpensesReport(req: Request, res: Response): Promise<void> {
  const cookie = getCookie(req);
  if (!cookie) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const from = optionalString(req.query.from);
  const to = optionalString(req.query.to);

  const [expenses, employeesById] = await Promise.all([
    fetchOrgExpenses(cookie, { from, to, isRedFlagged: "true" }),
    fetchAllEmployees(cookie),
  ]);

  const rows = expenses.map((expense) => {
    const employee = expense.employeeId ? employeesById.get(expense.employeeId) : undefined;
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

  res.status(200).json({ rows });
}
