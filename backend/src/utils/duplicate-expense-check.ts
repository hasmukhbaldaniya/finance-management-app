import { Op } from "sequelize";
import { Claim, Employee, Expense } from "../models";

export type DuplicateExpenseMatch = {
  claimName: string | null;
  claimantName: string;
  expenseDate: string | null;
};

// Duplicate = same Expense Date + same Invoice/Bill Number + same Amount,
// checked at organization level across every employee's expenses — 023's
// own Duplicate Bill Detection story, confirmed highlight-not-block. Only
// runs for categories where a field is marked useAsInvoiceNumber (022's new,
// optional CategoryField flag) — a category with no such field structurally
// has nothing to match on, so this returns null immediately rather than
// falling back to a weaker Date+Amount-only match.
export async function findDuplicateExpense(params: {
  organizationId: number;
  invoiceNumber: string | null;
  expenseDate: string | null;
  amount: string;
  excludeExpenseId?: number;
}): Promise<DuplicateExpenseMatch | null> {
  const { organizationId, invoiceNumber, expenseDate, amount, excludeExpenseId } = params;
  if (!invoiceNumber || !expenseDate) return null;

  const match = await Expense.findOne({
    where: {
      organizationId,
      invoiceNumber,
      expenseDate,
      amount,
      ...(excludeExpenseId ? { id: { [Op.ne]: excludeExpenseId } } : {}),
    },
    order: [["createdAt", "ASC"]],
  });
  if (!match) return null;

  const claim = await Claim.findByPk(match.claimId);
  const claimant = claim ? await Employee.findByPk(claim.employeeId) : null;

  return {
    claimName: claim?.name ?? null,
    claimantName: claimant ? `${claimant.firstName} ${claimant.lastName}`.trim() : "Another employee",
    expenseDate: match.expenseDate,
  };
}
