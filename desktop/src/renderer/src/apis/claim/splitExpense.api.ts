import { postJson } from "@/utils/apiManager/apiManager";

export type SplitExpensePortion = {
  categoryId: number;
  amount: number;
  paidBy?: "company" | "self";
};

export function splitExpense(
  claimId: number,
  expenseId: number,
  portions: SplitExpensePortion[]
): Promise<{ expenses: { id: number; categoryId: number | null; amount: string; paidBy: string }[] }> {
  return postJson(`/claims/${claimId}/expenses/${expenseId}/split`, { portions });
}
