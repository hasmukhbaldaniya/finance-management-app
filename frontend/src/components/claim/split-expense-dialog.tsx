"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";
import { splitExpense } from "@/apis/claim";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { formatInr } from "@/utils/helpers/format.helper";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import type { ClaimableCategory } from "@/types/claim.type";
import { CategorySelect } from "./category-select";
import type { LocalExpense } from "./local-expense.type";

type Portion = { categoryId: number | null; amount: string; paidBy: "company" | "self" };

type SplitExpenseDialogProps = {
  claimId: number;
  expense: LocalExpense | null;
  categories: ClaimableCategory[];
  onOpenChange: (open: boolean) => void;
  onSplit: () => void;
};

// 022's Split an Expense — divides one expense's Amount across 2+
// Category/Amount portions; portions must sum to the original Amount.
export function SplitExpenseDialog({ claimId, expense, categories, onOpenChange, onSplit }: SplitExpenseDialogProps) {
  const [portions, setPortions] = useState<Portion[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (expense) {
      setPortions([
        { categoryId: null, amount: "", paidBy: "self" },
        { categoryId: null, amount: "", paidBy: "self" },
      ]);
    }
  }, [expense]);

  if (!expense) return null;

  const originalAmount = Number(expense.amount ?? 0);
  const allocated = portions.reduce((total, portion) => total + (Number(portion.amount) || 0), 0);
  const remaining = originalAmount - allocated;

  function updatePortion(index: number, patch: Partial<Portion>): void {
    setPortions((previous) => previous.map((portion, portionIndex) => (portionIndex === index ? { ...portion, ...patch } : portion)));
  }

  async function handleConfirm(): Promise<void> {
    if (portions.length < 2 || portions.some((portion) => !portion.categoryId || !portion.amount)) {
      toast.error("Fill in a category and amount for every portion.");
      return;
    }
    if (Math.abs(remaining) > 0.01) {
      toast.error("Split amounts must add up to the original expense amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      await splitExpense(
        claimId,
        expense!.id!,
        portions.map((portion) => ({ categoryId: portion.categoryId!, amount: Number(portion.amount), paidBy: portion.paidBy }))
      );
      toast.success("Expense split.");
      onSplit();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={expense !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Split Expense</DialogTitle>
          <DialogDescription>Original amount: ₹{formatInr(originalAmount)}. Remaining to allocate: ₹{formatInr(remaining)}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {portions.map((portion, index) => (
            <div key={index} className="grid grid-cols-2 gap-2 rounded-md border border-border p-3">
              <div className="col-span-2 space-y-1">
                <Label>Category</Label>
                <CategorySelect categories={categories} value={portion.categoryId} onChange={(categoryId) => updatePortion(index, { categoryId })} />
              </div>
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input type="number" value={portion.amount} onChange={(event) => updatePortion(index, { amount: event.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Paid By</Label>
                <SelectField
                  value={portion.paidBy}
                  onValueChange={(value) => updatePortion(index, { paidBy: value as "company" | "self" })}
                  options={[
                    { value: "self", label: "Self Paid" },
                    { value: "company", label: "Company Paid" },
                  ]}
                />
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setPortions((previous) => [...previous, { categoryId: null, amount: "", paidBy: "self" }])}>
            Add Portion
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            Confirm Split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
