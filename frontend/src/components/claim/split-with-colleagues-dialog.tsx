"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { createSplitRequest } from "@/apis/split-request";
import { getEmployees } from "@/apis/employee";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { formatInr } from "@/utils/helpers/format.helper";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import type { SplitRequestSplitType } from "@/types/split-request.type";
import type { EmployeeListItem } from "@/types/employee.type";
import type { LocalExpense } from "./local-expense.type";

const SEARCH_DEBOUNCE_MS = 250;
const MAX_COLLEAGUES = 9;

type SplitWithColleaguesDialogProps = {
  claimId: number;
  expense: LocalExpense | null;
  onOpenChange: (open: boolean) => void;
  onSplit: () => void;
};

type SelectedColleague = { employeeId: number; name: string; value: string };

// 025's "Split with Colleagues" — invite up to 9 colleagues in the same
// organization to cover a share of this one expense; each gets an inbox
// entry (Split Request) they can Accept (raising their own claim) or
// Reject. Distinct from "Move to New Claim"/"Split Expense" above, which
// only ever move an employee's own expenses around, never another
// employee's.
export function SplitWithColleaguesDialog({ claimId, expense, onOpenChange, onSplit }: SplitWithColleaguesDialogProps) {
  const [splitType, setSplitType] = useState<SplitRequestSplitType>("percentage");
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<EmployeeListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<SelectedColleague[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!expense) {
      setSelected([]);
      setSearch("");
      setSplitType("percentage");
    }
  }, [expense]);

  useEffect(() => {
    if (!expense) return;
    const timeout = setTimeout(() => {
      setIsSearching(true);
      getEmployees({ name: search, status: ["active"], pageSize: 20 })
        .then((response) => setCandidates(response.employees))
        .catch(() => setCandidates([]))
        .finally(() => setIsSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search, expense]);

  if (!expense) return null;

  const originalAmount = Number(expense.amount ?? 0);
  const isSelected = (employeeId: number) => selected.some((member) => member.employeeId === employeeId);

  function toggle(employee: EmployeeListItem): void {
    setSelected((previous) => {
      if (previous.some((member) => member.employeeId === employee.id)) {
        return previous.filter((member) => member.employeeId !== employee.id);
      }
      if (previous.length >= MAX_COLLEAGUES) {
        toast.error(`You can split with up to ${MAX_COLLEAGUES} colleagues.`);
        return previous;
      }
      return [...previous, { employeeId: employee.id, name: `${employee.firstName} ${employee.lastName}`.trim(), value: "" }];
    });
  }

  function updateValue(employeeId: number, value: string): void {
    setSelected((previous) => previous.map((member) => (member.employeeId === employeeId ? { ...member, value } : member)));
  }

  const colleagueTotal = selected.reduce((total, member) => total + (Number(member.value) || 0), 0);
  const remainderPercentage = splitType === "percentage" ? Math.max(0, 100 - colleagueTotal) : null;
  const remainderAmount = splitType === "amount" ? Math.max(0, originalAmount - colleagueTotal) : null;

  async function handleConfirm(): Promise<void> {
    if (selected.length === 0) {
      toast.error("Add at least one colleague to split with.");
      return;
    }
    if (selected.some((member) => !member.value || Number(member.value) <= 0)) {
      toast.error(splitType === "percentage" ? "Enter a percentage for every colleague." : "Enter an amount for every colleague.");
      return;
    }
    if (splitType === "percentage" && colleagueTotal > 100) {
      toast.error("Percentages can't add up to more than 100%.");
      return;
    }
    if (splitType === "amount" && colleagueTotal > originalAmount) {
      toast.error("Amounts can't add up to more than the expense's own amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createSplitRequest(claimId, expense!.id!, {
        splitType,
        members: selected.map((member) =>
          splitType === "percentage" ? { employeeId: member.employeeId, percentage: Number(member.value) } : { employeeId: member.employeeId, amount: Number(member.value) }
        ),
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
      <DialogContent sx={{ width: "100%", maxWidth: 512 }}>
        <DialogHeader>
          <DialogTitle>Split with Colleagues</DialogTitle>
          <DialogDescription>Invite colleagues to cover a share of this ₹{formatInr(originalAmount)} expense.</DialogDescription>
        </DialogHeader>

        <Stack spacing={1.5} sx={{ borderBottom: 1, borderColor: "divider", pb: 2 }}>
          <Label>Split By</Label>
          <Stack direction="row" spacing={2} sx={{ fontSize: "0.875rem" }}>
            {(
              [
                { value: "percentage" as const, label: "Percentage" },
                { value: "amount" as const, label: "Amount" },
              ] as const
            ).map((option) => (
              <Box component="label" key={option.value} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <input type="radio" name="split-request-type" checked={splitType === option.value} onChange={() => setSplitType(option.value)} />
                {option.label}
              </Box>
            ))}
          </Stack>
        </Stack>

        <Stack spacing={1}>
          <Label>Colleagues</Label>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" />
          <Stack spacing={0.5} sx={{ maxHeight: 128, overflowY: "auto", borderRadius: 1.5, border: 1, borderColor: "divider", p: 1 }}>
            {isSearching ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                <Spinner size={16} />
              </Box>
            ) : candidates.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, py: 1 }}>
                No colleagues found.
              </Typography>
            ) : (
              candidates.map((employee) => (
                <Box
                  component="label"
                  key={employee.id}
                  sx={{ display: "flex", alignItems: "center", gap: 1, borderRadius: 1, px: 0.5, py: 0.5, fontSize: "0.875rem", "&:hover": { bgcolor: "action.hover" } }}
                >
                  <input type="checkbox" checked={isSelected(employee.id)} onChange={() => toggle(employee)} />
                  {employee.firstName} {employee.lastName}
                  <Typography component="span" variant="caption" color="text.secondary">
                    {employee.email}
                  </Typography>
                </Box>
              ))
            )}
          </Stack>
        </Stack>

        {selected.length > 0 ? (
          <Stack spacing={1} sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
            <Label>{splitType === "percentage" ? "Percentage per colleague" : "Amount per colleague"}</Label>
            {selected.map((member) => (
              <Stack direction="row" key={member.employeeId} spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <Typography variant="body2">{member.name}</Typography>
                <Input
                  type="number"
                  sx={{ width: 112 }}
                  value={member.value}
                  onChange={(event) => updateValue(member.employeeId, event.target.value)}
                  placeholder={splitType === "percentage" ? "%" : "₹"}
                />
              </Stack>
            ))}
            <Typography variant="caption" color="text.secondary">
              {splitType === "percentage" ? `You retain ${remainderPercentage}%.` : `You retain ₹${formatInr(remainderAmount ?? 0)}.`}
            </Typography>
          </Stack>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            Send Split Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
