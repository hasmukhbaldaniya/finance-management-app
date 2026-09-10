import { apiCall } from "@/utils/apiManager/apiManager";
import type { DuplicateMatch } from "@/types/claim.type";

export function checkExpenseDuplicate(claimId: number, expenseId: number): Promise<{ duplicate: Omit<DuplicateMatch, "expenseId"> | null }> {
  return apiCall(`/claims/${claimId}/expenses/${expenseId}/duplicate-check`, { method: "GET" });
}
