import { postJson } from "@/utils/apiManager/apiManager";

export function unmergeInvoicePages(claimId: number, expenseId: number): Promise<{ message: string }> {
  return postJson(`/claims/${claimId}/expenses/${expenseId}/unmerge`, {});
}
