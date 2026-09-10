"use client";

import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useSession } from "@/contexts/SessionContext";
import type { EmployeeListItem } from "@/types/employee.type";
import type { ClaimableCategory } from "@/types/claim.type";
import { SplitAmongSelect } from "./split-among-select";
import { SplitPercentageTable, distributeEvenly, membersToColleagues, type SplitMember } from "./split-percentage-table";
import { getClientComputedAmount } from "./expense-completeness";
import type { LocalExpense } from "./local-expense.type";

const MAX_COLLEAGUES = 9;
const SUM_TOLERANCE = 0.01;

type SplitExpenseDialogProps = {
  expense: LocalExpense | null;
  categories: ClaimableCategory[];
  initialMembers?: SplitMember[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (members: SplitMember[]) => void;
};

// 027's redesign — replaces both the old Category/Amount-portions "Split
// Expense" and 025's own "Split with Colleagues": a single cross-employee
// percentage split, scoped to just this one expense. "Yes, Submit" only
// stages the chosen split via `onConfirm` — the actual Split Request (and its
// colleague email) is created only once the parent's Save Claim succeeds, see
// claim-manual-form.tsx's/ai-review-screen.tsx's own `pendingExpenseSplits`.
export function SplitExpenseDialog({ expense, categories, initialMembers, onOpenChange, onConfirm }: SplitExpenseDialogProps) {
  const { user } = useSession();
  const [colleagues, setColleagues] = useState<EmployeeListItem[]>([]);
  const [members, setMembers] = useState<SplitMember[]>([]);

  // Reads the live, in-progress field value (not the server-denormalized
  // `expense.amount`, which is stale until the next save) so the dialog
  // reflects whatever the user just typed, saved or not.
  const category = expense ? categories.find((candidate) => candidate.id === expense.categoryId) ?? null : null;
  const originalAmount = expense ? getClientComputedAmount(expense, category) ?? 0 : 0;

  useEffect(() => {
    if (!expense) {
      setColleagues([]);
      setMembers([]);
      return;
    }
    if (initialMembers && initialMembers.length > 0) {
      // Percentages are the staged intent; amounts are recomputed against
      // the current total in case fields were edited since staging.
      const recomputed = initialMembers.map((member) => ({ ...member, amount: Number(((member.percentage / 100) * originalAmount).toFixed(2)) }));
      setMembers(recomputed);
      setColleagues(membersToColleagues(recomputed));
      return;
    }
    // Reset to just the requester at 100% whenever a different expense is opened.
    setColleagues([]);
    setMembers(distributeEvenly([{ employeeId: user.id, name: user.name, isRequester: true }], originalAmount));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense?.id]);

  function handleColleaguesChange(nextColleagues: EmployeeListItem[]): void {
    setColleagues(nextColleagues);
    const memberSeeds = [
      { employeeId: user.id, name: user.name, isRequester: true },
      ...nextColleagues.map((employee) => ({ employeeId: employee.id, name: `${employee.firstName} ${employee.lastName}`.trim(), isRequester: false })),
    ];
    setMembers(distributeEvenly(memberSeeds, originalAmount));
  }

  if (!expense) return null;

  const percentageSum = members.reduce((total, member) => total + member.percentage, 0);
  const canSubmit = colleagues.length > 0 && Math.abs(percentageSum - 100) <= SUM_TOLERANCE;

  function handleConfirm(): void {
    if (!canSubmit) {
      toast.error("Splits must add up to 100%.");
      return;
    }
    onConfirm(members);
    toast.success("Split saved — it'll be sent to your colleagues when you save this claim.");
    onOpenChange(false);
  }

  return (
    <Dialog open={expense !== null} onOpenChange={onOpenChange}>
      <DialogContent sx={{ width: "100%", maxWidth: 600 }}>
        <DialogHeader>
          <DialogTitle>Split Expense</DialogTitle>
          <DialogDescription>Distribute the total bill amount among your colleagues. Ensure the sum matches the receipt total.</DialogDescription>
        </DialogHeader>

        <Stack spacing={2}>
          <Stack spacing={1}>
            <Label>Split Among</Label>
            <SplitAmongSelect
              requesterId={user.id}
              requesterName={user.name}
              selectedColleagues={colleagues}
              onChange={handleColleaguesChange}
              maxColleagues={MAX_COLLEAGUES}
            />
          </Stack>

          <SplitPercentageTable members={members} totalAmount={originalAmount} onChange={setMembers} />
        </Stack>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canSubmit}>
            Yes, Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
