import { env } from "../config/env";
import { fetchAllPages } from "./upstream-client";

export type ClaimSummary = {
  id: number;
  name: string | null;
  employeeId: number;
  claimType: string;
  status: string;
  totalAmount: string;
  createdAt: string;
};

export type TripSummary = {
  id: number;
  name: string;
  employeeId: number;
  status: string;
  startAt: string;
  endAt: string;
  totalAmount: string;
  approvedAmount: string | null;
};

export type ExpenseSummary = {
  id: number;
  claimId: number;
  claimName: string | null;
  employeeId: number | null;
  categoryId: number | null;
  amount: string;
  expenseDate: string | null;
  isRedFlagged: boolean;
  redFlagReason: string | null;
};

export type CategorySummary = {
  id: number;
  name: string;
  isEnabled: boolean;
};

export function fetchOrgClaims(cookie: string, params: { from?: string; to?: string }): Promise<ClaimSummary[]> {
  return fetchAllPages<ClaimSummary>(env.claimServiceUrl, "/api/claims/org", "claims", cookie, params);
}

export function fetchOrgTrips(
  cookie: string,
  params: { from?: string; to?: string; status?: string }
): Promise<TripSummary[]> {
  return fetchAllPages<TripSummary>(env.claimServiceUrl, "/api/trips/org", "trips", cookie, params);
}

export function fetchOrgExpenses(
  cookie: string,
  params: { from?: string; to?: string; isRedFlagged?: string; categoryId?: string }
): Promise<ExpenseSummary[]> {
  return fetchAllPages<ExpenseSummary>(env.claimServiceUrl, "/api/expenses/org", "expenses", cookie, params);
}

// Categories are already org-wide (not per-employee) on claim-service — no
// new endpoint needed, just a plain forward of the existing one.
export function fetchAllCategories(cookie: string): Promise<CategorySummary[]> {
  return fetchAllPages<CategorySummary>(env.claimServiceUrl, "/api/categories", "categories", cookie);
}
