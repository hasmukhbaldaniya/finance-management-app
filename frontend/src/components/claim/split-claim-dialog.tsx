"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { splitClaim } from "@/apis/claim";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { formatInr } from "@/utils/helpers/format.helper";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import type { ClaimableCategory, ClaimType } from "@/types/claim.type";
import type { TripListItem } from "@/types/trip.type";
import { TripSelect } from "./trip-select";
import type { LocalExpense } from "./local-expense.type";

type SplitClaimDialogProps = {
  claimId: number;
  expenses: LocalExpense[];
  categories: ClaimableCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// 022's Split a Claim — moves selected expenses onto a brand-new,
// independent claim; at least one expense must remain on the original.
export function SplitClaimDialog({ claimId, expenses, categories, open, onOpenChange }: SplitClaimDialogProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [claimType, setClaimType] = useState<ClaimType>("standalone");
  const [name, setName] = useState("");
  const [trip, setTrip] = useState<TripListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(expenseId: number): void {
    setSelectedIds((previous) => (previous.includes(expenseId) ? previous.filter((id) => id !== expenseId) : [...previous, expenseId]));
  }

  async function handleConfirm(): Promise<void> {
    if (selectedIds.length === 0) {
      toast.error("Select at least one expense to move.");
      return;
    }
    if (selectedIds.length >= expenses.length) {
      toast.error("At least one expense must remain on this claim.");
      return;
    }
    if (claimType === "standalone" && !name.trim()) {
      toast.error("Claim Name is required.");
      return;
    }
    if (claimType === "trip_linked" && !trip) {
      toast.error("Select a trip.");
      return;
    }

    setIsSubmitting(true);
    try {
      await splitClaim(claimId, {
        expenseIds: selectedIds,
        newClaim: { claimType, name: claimType === "standalone" ? name.trim() : undefined, tripId: claimType === "trip_linked" ? (trip?.id ?? undefined) : undefined },
      });
      toast.success("Claim split successfully.");
      onOpenChange(false);
      router.push(ROUTES.CLAIMS);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent sx={{ width: "100%", maxWidth: 512 }}>
        <DialogHeader>
          <DialogTitle>Move to New Claim</DialogTitle>
          <DialogDescription>Choose which expenses move to a brand-new claim.</DialogDescription>
        </DialogHeader>

        <Stack spacing={1} sx={{ maxHeight: 192, overflowY: "auto" }}>
          {expenses.map((expense) => {
            const category = categories.find((candidate) => candidate.id === expense.categoryId);
            return (
              <Stack
                component="label"
                direction="row"
                key={expense.id}
                spacing={1}
                sx={{ alignItems: "center", justifyContent: "space-between", borderRadius: 1.5, border: 1, borderColor: "divider", p: 1, fontSize: "0.875rem" }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <input type="checkbox" checked={selectedIds.includes(expense.id!)} onChange={() => toggle(expense.id!)} />
                  {category?.name ?? "Uncategorized"}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  ₹{formatInr(expense.amount ?? "0")}
                </Typography>
              </Stack>
            );
          })}
        </Stack>

        <Stack spacing={1.5} sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
          <Label>New claim</Label>
          <Stack direction="row" spacing={2} sx={{ fontSize: "0.875rem" }}>
            {(
              [
                { value: "standalone" as const, label: "Create New Claim" },
                { value: "trip_linked" as const, label: "Link to Trip" },
              ] as const
            ).map((option) => (
              <Box component="label" key={option.value} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <input type="radio" name="split-claim-type" checked={claimType === option.value} onChange={() => setClaimType(option.value)} />
                {option.label}
              </Box>
            ))}
          </Stack>
          {claimType === "standalone" ? (
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Claim Name" />
          ) : (
            <TripSelect value={trip} onChange={setTrip} placeholder="Select trip" />
          )}
        </Stack>

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
