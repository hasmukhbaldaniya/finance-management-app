import type { Response } from "express";
import { Op, type WhereOptions } from "sequelize";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Claim, Expense, Trip } from "../models";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../utils/constants/claim.constant";
import { TRIP_STATUSES } from "../utils/constants/trip.constant";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const VALID_TRIP_STATUSES = new Set<string>(TRIP_STATUSES);

// Shared by all three endpoints below — 028-reports.md's Prerequisite
// section: reports (and any future admin-only, cross-employee screen) need
// to see every employee's records, not just the caller's own, unlike every
// other read endpoint in this file (listClaims/listTrips are deliberately
// self-scoped). Gated by requireOwner (see that middleware's own doc
// comment for why isOwner, not the unwired `reports` privilege from
// 006-roles-and-privileges-management.md).
function dateRange(fromRaw: unknown, toRaw: unknown): { from: Date | null; to: Date | null } {
  const from = typeof fromRaw === "string" && fromRaw ? new Date(fromRaw) : null;
  const to = typeof toRaw === "string" && toRaw ? new Date(toRaw) : null;
  return {
    from: from && !Number.isNaN(from.getTime()) ? from : null,
    // Inclusive of the whole "to" day, not just midnight — a `to` of
    // 2026-07-24 should include claims created any time that day.
    to: to && !Number.isNaN(to.getTime()) ? new Date(to.getTime() + 24 * 60 * 60 * 1000) : null,
  };
}

function paginationParams(req: AuthenticatedRequest): { page: number; pageSize: number } {
  const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(req.query.pageSize)) || DEFAULT_PAGE_SIZE));
  return { page, pageSize };
}

// GET /api/claims/org — every claim in the org, not just the caller's own.
export async function listClaimsForOrg(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const { page, pageSize } = paginationParams(req);
  const conditions: WhereOptions[] = [{ organizationId: req.organizationId }, { hasBeenSaved: true }];

  if (typeof req.query.employeeId === "string" && req.query.employeeId) {
    const employeeId = Number(req.query.employeeId);
    if (!Number.isNaN(employeeId)) conditions.push({ employeeId });
  }
  if (typeof req.query.status === "string" && req.query.status) {
    conditions.push({ status: req.query.status });
  }
  const { from, to } = dateRange(req.query.from, req.query.to);
  if (from) conditions.push({ createdAt: { [Op.gte]: from } });
  if (to) conditions.push({ createdAt: { [Op.lt]: to } });

  const { rows, count } = await Claim.findAndCountAll({
    where: { [Op.and]: conditions },
    order: [["createdAt", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  res.status(200).json({
    claims: rows.map((claim) => ({
      id: claim.id,
      name: claim.name,
      employeeId: claim.employeeId,
      claimType: claim.claimType,
      status: claim.status,
      totalAmount: claim.totalAmount,
      createdAt: claim.createdAt,
    })),
    hasMore: page * pageSize < count,
  });
}

// GET /api/trips/org — every trip in the org, not just the caller's own.
export async function listTripsForOrg(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const { page, pageSize } = paginationParams(req);
  const conditions: WhereOptions[] = [{ organizationId: req.organizationId }];

  if (typeof req.query.employeeId === "string" && req.query.employeeId) {
    const employeeId = Number(req.query.employeeId);
    if (!Number.isNaN(employeeId)) conditions.push({ employeeId });
  }
  if (typeof req.query.status === "string" && VALID_TRIP_STATUSES.has(req.query.status)) {
    conditions.push({ status: req.query.status });
  }
  // Trip Cost report filters by startAt (per 028-reports.md), not createdAt.
  const { from, to } = dateRange(req.query.from, req.query.to);
  if (from) conditions.push({ startAt: { [Op.gte]: from } });
  if (to) conditions.push({ startAt: { [Op.lt]: to } });

  const { rows, count } = await Trip.findAndCountAll({
    where: { [Op.and]: conditions },
    order: [["startAt", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  res.status(200).json({
    trips: rows.map((trip) => ({
      id: trip.id,
      name: trip.name,
      employeeId: trip.employeeId,
      status: trip.status,
      startAt: trip.startAt,
      endAt: trip.endAt,
      totalAmount: trip.totalAmount,
      approvedAmount: trip.approvedAmount,
    })),
    hasMore: page * pageSize < count,
  });
}

// GET /api/expenses/org — there is no standalone expense listing anywhere
// else in this codebase (expenses are otherwise only ever read as a
// sub-resource of one claim, via getClaimDetail) — this is genuinely new,
// not a relaxed-scope variant of an existing endpoint.
export async function listExpensesForOrg(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const { page, pageSize } = paginationParams(req);
  const conditions: WhereOptions[] = [{ organizationId: req.organizationId }];

  if (typeof req.query.categoryId === "string" && req.query.categoryId) {
    const categoryId = Number(req.query.categoryId);
    if (!Number.isNaN(categoryId)) conditions.push({ categoryId });
  }
  if (req.query.isRedFlagged === "true") {
    conditions.push({ isRedFlagged: true });
  }
  // Red-Flagged Expenses report filters by expenseDate (per 028-reports.md).
  const { from, to } = dateRange(req.query.from, req.query.to);
  if (from) conditions.push({ expenseDate: { [Op.gte]: from } });
  if (to) conditions.push({ expenseDate: { [Op.lt]: to } });

  const { rows, count } = await Expense.findAndCountAll({
    where: { [Op.and]: conditions },
    order: [["expenseDate", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  // Expense has no employeeId of its own (only claimId) — batch-resolve the
  // owning claim for employeeId + claim name, same "one batched query, not
  // N+1" pattern listClaims already uses for trip names.
  const claimIds = Array.from(new Set(rows.map((expense) => expense.claimId)));
  const claims = claimIds.length > 0 ? await Claim.findAll({ where: { id: claimIds } }) : [];
  const claimById = new Map(claims.map((claim) => [claim.id, claim]));

  res.status(200).json({
    expenses: rows.map((expense) => {
      const claim = claimById.get(expense.claimId);
      return {
        id: expense.id,
        claimId: expense.claimId,
        claimName: claim?.name ?? null,
        employeeId: claim?.employeeId ?? null,
        categoryId: expense.categoryId,
        amount: expense.amount,
        expenseDate: expense.expenseDate,
        isRedFlagged: expense.isRedFlagged,
        redFlagReason: expense.redFlagReason,
      };
    }),
    hasMore: page * pageSize < count,
  });
}
