"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { acceptSplitRequest, rejectSplitRequest } from "@/apis/split-request";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/contexts/SessionContext";
import { formatInr } from "@/utils/helpers/format.helper";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import type { ClaimType } from "@/types/claim.type";
import type { SplitRequestDetail } from "@/types/split-request.type";
import { SplitRequestExpenseSnapshotView } from "./split-request-expense-snapshot";
import { TripSelect, type TripSelectValue } from "./trip-select";

type SplitRequestRespondDialogProps = {
  request: SplitRequestDetail | null;
  onOpenChange: (open: boolean) => void;
  onResponded: () => void;
};

// 025's own respond modal — the invited colleague's Member/Percentage/
// Amount breakdown, a read-only view of the original expense, and the
// Claim Type fork (Create New Claim / Link to Trip) that Accept turns into
// a real Draft claim for.
export function SplitRequestRespondDialog({ request, onOpenChange, onResponded }: SplitRequestRespondDialogProps) {
  const router = useRouter();
  const { user } = useSession();
  const [claimType, setClaimType] = useState<ClaimType>("standalone");
  const [name, setName] = useState("");
  const [trip, setTrip] = useState<TripSelectValue | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  if (!request) return null;

  const myMember = request.members.find((member) => member.employeeId === user.id);

  async function handleAccept(): Promise<void> {
    if (claimType === "standalone" && !name.trim()) {
      toast.error("Claim Name is required.");
      return;
    }
    if (claimType === "trip_linked" && !trip) {
      toast.error("Select a trip.");
      return;
    }

    setIsAccepting(true);
    try {
      const { newClaimId } = await acceptSplitRequest(request!.id, {
        claimType,
        name: claimType === "standalone" ? name.trim() : undefined,
        tripId: claimType === "trip_linked" ? (trip?.id ?? undefined) : undefined,
      });
      toast.success("Split request accepted — claim created.");
      onOpenChange(false);
      onResponded();
      router.push(ROUTES.claimManualEdit(newClaimId));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsAccepting(false);
    }
  }

  async function handleReject(): Promise<void> {
    setIsRejecting(true);
    try {
      await rejectSplitRequest(request!.id);
      toast.success("Split request rejected.");
      onOpenChange(false);
      onResponded();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsRejecting(false);
    }
  }

  const isSubmitting = isAccepting || isRejecting;

  return (
    <Dialog open={request !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Split Request #{request.id}</DialogTitle>
          <DialogDescription>Split Request by: {request.requestedBy} — you&apos;ve been added to a split expense. Review and respond below.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Label>Split Breakdown</Label>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Member</th>
                    <th className="px-3 py-2 font-medium">%</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {request.members.map((member) => (
                    <tr key={member.employeeId} className="border-t border-border">
                      <td className="px-3 py-2">
                        {member.name} {member.employeeId === user.id ? <span className="text-muted-foreground">(You)</span> : null}
                      </td>
                      <td className="px-3 py-2">{member.percentage}%</td>
                      <td className="px-3 py-2">₹{formatInr(member.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {myMember ? (
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Your Share</span>
                <span className="font-semibold">
                  ₹{formatInr(myMember.amount)} · {myMember.percentage}%
                </span>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <Label>Expense Form</Label>
            <SplitRequestExpenseSnapshotView expense={request.expense} />
          </div>
        </div>

        {myMember?.status === "pending" ? (
          <div className="space-y-3 border-t border-border pt-4">
            <Label>Claim Type*</Label>
            <div className="flex gap-4 text-sm">
              {(
                [
                  { value: "standalone" as const, label: "Create New Claim" },
                  { value: "trip_linked" as const, label: "Link to Trip" },
                ] as const
              ).map((option) => (
                <label key={option.value} className="flex items-center gap-2">
                  <input type="radio" name="split-respond-claim-type" checked={claimType === option.value} onChange={() => setClaimType(option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
            {claimType === "standalone" ? (
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Claim Name" />
            ) : (
              <TripSelect value={trip} onChange={setTrip} placeholder="Select trip" />
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {myMember?.status === "pending" ? (
            <>
              <Button type="button" variant="destructive" onClick={handleReject} disabled={isSubmitting}>
                {isRejecting ? <Spinner /> : null}
                Reject
              </Button>
              <Button type="button" onClick={handleAccept} disabled={isSubmitting}>
                {isAccepting ? <Spinner /> : null}
                Accept Split Request
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
