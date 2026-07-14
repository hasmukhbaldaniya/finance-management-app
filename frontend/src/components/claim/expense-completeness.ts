import type { ClaimableCategory } from "@/types/claim.type";
import type { LocalExpense } from "./local-expense.type";

function isFieldValueFilled(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

// Before an expense has ever been saved, `expense.amount` (the denormalized
// column) doesn't exist yet — it's only computed server-side, from whichever
// field carries `config.useAsClaimAmount`, once the expense is actually
// persisted. Read that same field's live value straight out of the
// in-progress `fieldValues` so completeness can be judged before the first
// save, not just after one. Falls back to the persisted `expense.amount`
// once that's available (e.g. a formula-computed amount field, which isn't
// re-derived here).
export function getClientComputedAmount(expense: LocalExpense, category: ClaimableCategory | null | undefined): number | null {
  if (category) {
    const amountField = category.fields.find((field) => field.fieldType === "amount" && field.config.useAsClaimAmount === true);
    if (amountField) {
      const raw = expense.fieldValues[String(amountField.id)];
      const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
      if (Number.isFinite(value)) return value;
    }
  }
  if (expense.amount) {
    const value = Number(expense.amount);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

// 027's Split Expense/Split Claim trigger-button gate — every one of the
// expense's own Category-configured required fields must be filled, not
// just Category + Amount. Deliberately independent of whether the expense
// has been saved yet (persistence is ensured separately, right before the
// split dialog actually opens) — a brand-new, never-saved expense with every
// field filled in is just as "complete" as one that's already been saved.
export function isExpenseComplete(expense: LocalExpense, category: ClaimableCategory | null | undefined): boolean {
  if (!expense.categoryId || !category) return false;
  if (!expense.paidBy) return false;

  const amount = getClientComputedAmount(expense, category);
  if (!amount || amount <= 0) return false;

  return category.fields
    .filter((field) => field.isRequired)
    .every((field) => isFieldValueFilled(expense.fieldValues[String(field.id)]));
}
