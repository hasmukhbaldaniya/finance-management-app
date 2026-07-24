// 028-reports.md — deliberately has no dependency on Trip.approvedAmount or
// any Approvals-epic status (that epic is on hold, see the story's own note).

export type ExpenseSummaryRow = {
  categoryId: number;
  categoryName: string;
  expenseCount: number;
  totalAmount: number;
};

export type ClaimCostRow = {
  claimId: number;
  claimName: string | null;
  employeeName: string | null;
  claimType: string;
  status: string;
  createdAt: string;
  totalAmount: number;
};

export type TripCostRow = {
  tripId: number;
  tripName: string;
  employeeName: string | null;
  status: string;
  startAt: string;
  endAt: string;
  totalAmount: number;
};

export type RedFlaggedExpenseRow = {
  expenseId: number;
  employeeName: string | null;
  claimId: number;
  claimName: string | null;
  amount: number;
  expenseDate: string | null;
  redFlagReason: string | null;
};
