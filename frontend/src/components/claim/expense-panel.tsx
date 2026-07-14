"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { statusTones } from "@/theme/colors";
import { Label } from "@/components/ui/label";
import type { ClaimableCategory } from "@/types/claim.type";
import { CategorySelect } from "./category-select";
import { ExpenseDynamicForm } from "./expense-dynamic-form";
import { isExpenseComplete } from "./expense-completeness";
import type { LocalExpense } from "./local-expense.type";

type ExpensePanelProps = {
  index: number;
  expense: LocalExpense;
  categories: ClaimableCategory[];
  onChange: (patch: Partial<LocalExpense>) => void;
  onRemove: () => void;
  onSplit: () => void;
  canRemove: boolean;
};

// 022's Expense panel — Category dropdown, that category's own dynamic
// field configuration, and Paid By, all per-expense. Split Expense (027's
// redesign — a cross-employee percentage split, see split-expense-dialog.tsx)
// is disabled until every one of this expense's own required fields is
// filled, not just Category + Amount.
export function ExpensePanel({ index, expense, categories, onChange, onRemove, onSplit, canRemove }: ExpensePanelProps) {
  const category = categories.find((candidate) => candidate.id === expense.categoryId) ?? null;
  const canSplit = isExpenseComplete(expense, category);

  return (
    <Stack spacing={2} sx={{ borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.paper", p: 2.5 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Expense {String(index + 1).padStart(2, "0")}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {expense.isRedFlagged ? (
            <Chip
              size="small"
              icon={<WarningCircleIcon size={14} />}
              label="Red Flag"
              title={expense.redFlagReason ?? undefined}
              sx={{ fontWeight: 500, bgcolor: statusTones.rejected.background, color: statusTones.rejected.text, "& .MuiChip-icon": { color: "inherit" } }}
            />
          ) : null}
          <Box
            component="button"
            type="button"
            onClick={onSplit}
            disabled={!canSplit}
            sx={{
              borderRadius: 1.5,
              px: 1,
              py: 0.5,
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "text.secondary",
              background: "none",
              border: "none",
              cursor: canSplit ? "pointer" : "not-allowed",
              opacity: canSplit ? 1 : 0.5,
              "&:hover": canSplit ? { bgcolor: "action.hover" } : undefined,
            }}
          >
            Split Expense
          </Box>
          {canRemove ? (
            <Box
              component="button"
              type="button"
              aria-label={`Remove expense ${index + 1}`}
              onClick={onRemove}
              sx={{
                display: "flex",
                width: 28,
                height: 28,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 1.5,
                color: "text.secondary",
                background: "none",
                border: "none",
                cursor: "pointer",
                "&:hover": { bgcolor: "error.main", color: "error.contrastText", opacity: 0.9 },
              }}
            >
              <XIcon size={14} />
            </Box>
          ) : null}
        </Stack>
      </Stack>

      <Stack spacing={1}>
        <Label>Category</Label>
        <CategorySelect
          categories={categories}
          value={expense.categoryId}
          onChange={(categoryId) => onChange({ categoryId, fieldValues: {} })}
        />
      </Stack>

      {category ? <ExpenseDynamicForm fields={category.fields} fieldValues={expense.fieldValues} onFieldValuesChange={(fieldValues) => onChange({ fieldValues })} /> : null}

      <Stack spacing={1} sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
        <Label>Paid By</Label>
        <Stack direction="row" spacing={2} sx={{ fontSize: "0.875rem" }}>
          {(
            [
              { value: "company", label: "Company Paid" },
              { value: "self", label: "Self Paid" },
            ] as const
          ).map((option) => (
            <Box component="label" key={option.value} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <input
                type="radio"
                name={`paid-by-${index}`}
                checked={expense.paidBy === option.value}
                onChange={() => onChange({ paidBy: option.value })}
              />
              {option.label}
            </Box>
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
