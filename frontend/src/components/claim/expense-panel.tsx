"use client";

import { WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import type { ClaimableCategory } from "@/types/claim.type";
import { CategorySelect } from "./category-select";
import { ExpenseDynamicForm } from "./expense-dynamic-form";
import type { LocalExpense } from "./local-expense.type";

type ExpensePanelProps = {
  index: number;
  expense: LocalExpense;
  categories: ClaimableCategory[];
  onChange: (patch: Partial<LocalExpense>) => void;
  onRemove: () => void;
  onSplit: () => void;
  onSplitWithColleagues: () => void;
  canRemove: boolean;
};

// 022's Expense panel — Category dropdown, that category's own dynamic
// field configuration, and Paid By, all per-expense. Split Expense is
// disabled until the expense has a Category and Amount, matching the
// reference screenshot's own greyed-out state on a blank expense. Split
// with Colleagues (025) shares the same gate — sharing an expense's cost
// needs the same Category/Amount as splitting it into portions does.
export function ExpensePanel({ index, expense, categories, onChange, onRemove, onSplit, onSplitWithColleagues, canRemove }: ExpensePanelProps) {
  const category = categories.find((candidate) => candidate.id === expense.categoryId) ?? null;
  const canSplit = expense.id !== undefined && expense.categoryId !== null && Boolean(expense.amount) && Number(expense.amount) > 0;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Expense {String(index + 1).padStart(2, "0")}</h3>
        <div className="flex items-center gap-2">
          {expense.isRedFlagged ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800" title={expense.redFlagReason ?? undefined}>
              <WarningCircleIcon size={14} /> Red Flag
            </span>
          ) : null}
          <button
            type="button"
            onClick={onSplit}
            disabled={!canSplit}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Split Expense
          </button>
          <button
            type="button"
            onClick={onSplitWithColleagues}
            disabled={!canSplit}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Split with Colleagues
          </button>
          {canRemove ? (
            <button
              type="button"
              aria-label={`Remove expense ${index + 1}`}
              onClick={onRemove}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <XIcon size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <CategorySelect
          categories={categories}
          value={expense.categoryId}
          onChange={(categoryId) => onChange({ categoryId, fieldValues: {} })}
        />
      </div>

      {category ? <ExpenseDynamicForm fields={category.fields} fieldValues={expense.fieldValues} onFieldValuesChange={(fieldValues) => onChange({ fieldValues })} /> : null}

      <div className="space-y-2 border-t border-border pt-4">
        <Label>Paid By</Label>
        <div className="flex gap-4 text-sm">
          {(
            [
              { value: "company", label: "Company Paid" },
              { value: "self", label: "Self Paid" },
            ] as const
          ).map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                name={`paid-by-${index}`}
                checked={expense.paidBy === option.value}
                onChange={() => onChange({ paidBy: option.value })}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
