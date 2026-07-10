// Shared in-progress expense shape used by both the manual flow and the AI
// review screen before/while it's saved via PUT /claims/:id/expenses.
export type LocalExpense = {
  id?: number;
  categoryId: number | null;
  paidBy: "company" | "self" | null;
  fieldValues: Record<string, unknown>;
  amount?: string;
  isRedFlagged?: boolean;
  redFlagReason?: string | null;
  // AI-review-only display info — undefined for manually-added expenses.
  sourceInvoiceFileId?: number | null;
  sourcePageNumber?: number | null;
  mergedFromExpenseIds?: number[] | null;
};
