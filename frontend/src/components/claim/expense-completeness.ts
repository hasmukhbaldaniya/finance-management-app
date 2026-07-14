import type { ClaimableCategory } from "@/types/claim.type";
import type { LocalExpense } from "./local-expense.type";

function isFieldValueFilled(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

// 027's Split Expense/Split Claim trigger-button gate — stricter than the
// old canSplit check (which only ever looked at categoryId + a positive
// amount): every one of the expense's own Category-configured required
// fields must be filled too, not just the two denormalized Expense columns.
export function isExpenseComplete(expense: LocalExpense, category: ClaimableCategory | null | undefined): boolean {
  if (!expense.id || expense.id <= 0) return false;
  if (!expense.categoryId || !category) return false;
  if (!expense.paidBy) return false;
  if (!expense.amount || Number(expense.amount) <= 0) return false;

  return category.fields
    .filter((field) => field.isRequired)
    .every((field) => isFieldValueFilled(expense.fieldValues[String(field.id)]));
}
