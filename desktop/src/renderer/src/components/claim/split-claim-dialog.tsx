"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { InfoIcon } from "@phosphor-icons/react";
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

type SplitClaimDialogProps = {
  expenses: LocalExpense[];
  categories: ClaimableCategory[];
  initialMembers?: SplitMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (members: SplitMember[]) => void;
};

// 027's redesign — replaces 022's own "Move to New Claim" (which used to
// move a subset of expenses onto a brand-new claim you still own). This is
// now the claim-level counterpart to Split Expense: the same chosen
// percentages are applied independently to every expense on the claim, one
// Split Request per original expense, each keeping its own Category —
// really "run Split Expense once per expense," not one lump-sum split.
// "Yes, Submit" only stages the chosen split via `onConfirm` — the actual
// Split Requests (and their colleague emails) are created only once the
// parent's Save Claim succeeds.
export function SplitClaimDialog({ expenses, categories, initialMembers, open, onOpenChange, onConfirm }: SplitClaimDialogProps) {
  const { user } = useSession();
  const [colleagues, setColleagues] = useState<EmployeeListItem[]>([]);
  const [members, setMembers] = useState<SplitMember[]>([]);

  // Reads each expense's live, in-progress field value (not the
  // server-denormalized `expense.amount`, which is stale until the next
  // save) so the total reflects whatever's currently typed into the forms.
  const totalAmount = expenses.reduce((total, expense) => {
    const category = categories.find((candidate) => candidate.id === expense.categoryId) ?? null;
    return total + (getClientComputedAmount(expense, category) ?? 0);
  }, 0);

  useEffect(() => {
    if (!open) return;
    if (initialMembers && initialMembers.length > 0) {
      // Percentages are the staged intent; amounts are recomputed against
      // the current total in case fields were edited since staging.
      const recomputed = initialMembers.map((member) => ({ ...member, amount: Number(((member.percentage / 100) * totalAmount).toFixed(2)) }));
      setMembers(recomputed);
      setColleagues(membersToColleagues(recomputed));
      return;
    }
    // Reset to just the requester at 100% every time the dialog opens.
    setColleagues([]);
    setMembers(distributeEvenly([{ employeeId: user.id, name: user.name, isRequester: true }], totalAmount));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleColleaguesChange(nextColleagues: EmployeeListItem[]): void {
    setColleagues(nextColleagues);
    const memberSeeds = [
      { employeeId: user.id, name: user.name, isRequester: true },
      ...nextColleagues.map((employee) => ({ employeeId: employee.id, name: `${employee.firstName} ${employee.lastName}`.trim(), isRequester: false })),
    ];
    setMembers(distributeEvenly(memberSeeds, totalAmount));
  }

  const percentageSum = members.reduce((total, member) => total + member.percentage, 0);
  const canSubmit = colleagues.length > 0 && expenses.length > 0 && Math.abs(percentageSum - 100) <= SUM_TOLERANCE;

  function handleConfirm(): void {
    if (!canSubmit) {
      toast.error("Splits must add up to 100%.");
      return;
    }
    onConfirm(members);
    toast.success(`Split saved for ${expenses.length} expense${expenses.length === 1 ? "" : "s"} — it'll be sent when you save this claim.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent sx={{ width: "100%", maxWidth: 600 }}>
        <DialogHeader>
          <DialogTitle>Split Claim</DialogTitle>
          <DialogDescription>Distribute the total claim amount among your colleagues. Ensure the sum matches the receipt total.</DialogDescription>
        </DialogHeader>

        <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", borderRadius: 1.5, bgcolor: "action.hover", p: 1.5, fontSize: "0.875rem" }}>
          <Box sx={{ mt: 0.25, flexShrink: 0, display: "flex", color: "text.secondary" }}>
            <InfoIcon size={16} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            All expenses listed here will be split with the selected team members.
          </Typography>
        </Stack>

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

          <SplitPercentageTable members={members} totalAmount={totalAmount} onChange={setMembers} />
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
