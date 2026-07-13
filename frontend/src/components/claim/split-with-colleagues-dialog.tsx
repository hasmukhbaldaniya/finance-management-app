"use client";

import { useEffect, useState } from "react";
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Split with Colleagues</DialogTitle>
          <DialogDescription>Invite colleagues to cover a share of this ₹{formatInr(originalAmount)} expense.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 border-b border-border pb-4">
          <Label>Split By</Label>
          <div className="flex gap-4 text-sm">
            {(
              [
                { value: "percentage" as const, label: "Percentage" },
                { value: "amount" as const, label: "Amount" },
              ] as const
            ).map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input type="radio" name="split-request-type" checked={splitType === option.value} onChange={() => setSplitType(option.value)} />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Colleagues</Label>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" />
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {isSearching ? (
              <div className="flex justify-center py-2">
                <Spinner size={16} />
              </div>
            ) : candidates.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">No colleagues found.</p>
            ) : (
              candidates.map((employee) => (
                <label key={employee.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                  <input type="checkbox" checked={isSelected(employee.id)} onChange={() => toggle(employee)} />
                  {employee.firstName} {employee.lastName}
                  <span className="text-xs text-muted-foreground">{employee.email}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {selected.length > 0 ? (
          <div className="space-y-2 border-t border-border pt-4">
            <Label>{splitType === "percentage" ? "Percentage per colleague" : "Amount per colleague"}</Label>
            {selected.map((member) => (
              <div key={member.employeeId} className="flex items-center justify-between gap-2 text-sm">
                <span>{member.name}</span>
                <Input
                  type="number"
                  className="w-28"
                  value={member.value}
                  onChange={(event) => updateValue(member.employeeId, event.target.value)}
                  placeholder={splitType === "percentage" ? "%" : "₹"}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {splitType === "percentage" ? `You retain ${remainderPercentage}%.` : `You retain ₹${formatInr(remainderAmount ?? 0)}.`}
            </p>
          </div>
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
