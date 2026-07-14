"use client";

import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import { toast } from "@/components/ui/toast";
import { createSplitRequest } from "@/apis/split-request";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/contexts/SessionContext";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import type { EmployeeListItem } from "@/types/employee.type";
import type { ClaimableCategory } from "@/types/claim.type";
import { SplitAmongSelect } from "./split-among-select";
import { SplitPercentageTable, distributeEvenly, type SplitMember } from "./split-percentage-table";
import { getClientComputedAmount } from "./expense-completeness";
import type { LocalExpense } from "./local-expense.type";

const MAX_COLLEAGUES = 9;
const SUM_TOLERANCE = 0.01;

type SplitExpenseDialogProps = {
  claimId: number;
  expense: LocalExpense | null;
  categories: ClaimableCategory[];
  onOpenChange: (open: boolean) => void;
  onSplit: () => void;
};

// 027's redesign — replaces both the old Category/Amount-portions "Split
// Expense" and 025's own "Split with Colleagues": a single cross-employee
// percentage split, scoped to just this one expense. Still routes through
// 025's Split Request inbox/Accept-Reject flow unchanged; only the trigger
// and the picker/table UI are new.
export function SplitExpenseDialog({ claimId, expense, categories, onOpenChange, onSplit }: SplitExpenseDialogProps) {
  const { user } = useSession();
  const [colleagues, setColleagues] = useState<EmployeeListItem[]>([]);
  const [members, setMembers] = useState<SplitMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  async function handleConfirm(): Promise<void> {
    if (!canSubmit) {
      toast.error("Splits must add up to 100%.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createSplitRequest(claimId, expense!.id!, {
        splitType: "percentage",
        members: members.map((member) => ({ employeeId: member.employeeId, percentage: member.percentage })),
      });
      toast.success("Split request sent.");
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
          <Button type="button" onClick={handleConfirm} disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? <Spinner /> : null}
            Yes, Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
