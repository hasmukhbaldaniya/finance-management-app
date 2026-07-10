import type { CategoryField } from "./category.type";

export type ClaimType = "standalone" | "trip_linked";
export type ClaimCreationMethod = "manual" | "ai";

// The fuller display-only set mirrors TripStatus's own precedent — this
// epic's own code only ever writes "draft"/"submitted"; the rest exist so
// the listing can display/filter sample data in those states.
export type ClaimStatus = "draft" | "submitted" | "pending_for_approval" | "ready_for_submission" | "approved_for_reimbursement";

export type ClaimListItem = {
  id: number;
  name: string | null;
  // For a trip-linked claim, the trip's own name stands in for the claim's
  // identity (022's own Open Question, resolved this way) — null otherwise.
  tripName: string | null;
  claimType: ClaimType;
  tripId: number | null;
  status: ClaimStatus;
  totalAmount: string;
  splitFromClaimId: number | null;
  createdAt: string;
};

export type Expense = {
  id: number;
  categoryId: number | null;
  position: number;
  paidBy: "company" | "self";
  fieldValues: Record<string, unknown>;
  amount: string;
  expenseDate: string | null;
  invoiceNumber: string | null;
  splitFromExpenseId: number | null;
  isRedFlagged: boolean;
  redFlagReason: string | null;
  sourceInvoiceFileId: number | null;
  sourcePageNumber: number | null;
  // Holds the original page numbers a Merge folded into this row (not
  // expense ids, despite the name — see backend's claim-ai.controller.ts
  // for why), null unless this expense is the result of a Merge.
  mergedFromExpenseIds: number[] | null;
};

export type ClaimDetail = {
  id: number;
  name: string | null;
  tripName: string | null;
  claimType: ClaimType;
  tripId: number | null;
  creationMethod: ClaimCreationMethod;
  status: ClaimStatus;
  totalAmount: string;
  splitFromClaimId: number | null;
  createdAt: string;
  expenses: Expense[];
};

export type DuplicateMatch = {
  expenseId: number;
  claimName: string | null;
  claimantName: string;
  expenseDate: string | null;
};

export type ClaimInvoiceFile = {
  id: number;
  originalFileName: string;
  fileType: "pdf" | "jpg" | "jpeg" | "png";
  pageCount: number | null;
};

export type ProcessingStatus = {
  isComplete: boolean;
  totalSources: number;
  resolvedSources: number;
  totalExpenses: number;
  totalAmount: string;
};

export type ClaimableCategory = {
  id: number;
  name: string;
  description: string | null;
  // Included inline since GET /api/categories/:id (which normally returns
  // this) sits behind requireOwner — see backend's listClaimableCategories.
  fields: CategoryField[];
};
