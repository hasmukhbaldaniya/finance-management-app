import { apiCall } from "@/utils/apiManager/apiManager";
import type { ClaimStatus, DuplicateMatch } from "@/types/claim.type";

export type SaveExpensePayload = {
  id?: number;
  categoryId: number;
  paidBy: "company" | "self";
  fieldValues: Record<string, unknown>;
};

export type SaveExpensesPayload = {
  isDraftSave: boolean;
  expenses: SaveExpensePayload[];
};

export type SaveExpensesResponse = {
  message: string;
  status: ClaimStatus;
  totalAmount: string;
  duplicates: DuplicateMatch[];
};

export function saveExpenses(claimId: number, payload: SaveExpensesPayload): Promise<SaveExpensesResponse> {
  return apiCall<SaveExpensesResponse>(`/claims/${claimId}/expenses`, { method: "PUT", body: JSON.stringify(payload) });
}
