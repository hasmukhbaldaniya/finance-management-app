"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { acceptSplitRequest, rejectSplitRequest } from "@/apis/split-request";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <DialogContent sx={{ width: "100%", maxWidth: 672 }}>
        <DialogHeader>
          <DialogTitle>Split Request #{request.id}</DialogTitle>
          <DialogDescription>Split Request by: {request.requestedBy} — you&apos;ve been added to a split expense. Review and respond below.</DialogDescription>
        </DialogHeader>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <Stack spacing={1.5}>
            <Label>Split Breakdown</Label>
            <Box sx={{ borderRadius: 2, border: 1, borderColor: "divider", overflow: "hidden" }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {request.members.map((member) => (
                    <TableRow key={member.employeeId}>
                      <TableCell>
                        {member.name} {member.employeeId === user.id ? <Typography component="span" color="text.secondary">(You)</Typography> : null}
                      </TableCell>
                      <TableCell>{member.percentage}%</TableCell>
                      <TableCell>₹{formatInr(member.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {myMember ? (
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderRadius: 1.5, bgcolor: "action.hover", px: 1.5, py: 1, fontSize: "0.875rem" }}>
                <Typography variant="body2" color="text.secondary">
                  Your Share
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  ₹{formatInr(myMember.amount)} · {myMember.percentage}%
                </Typography>
              </Stack>
            ) : null}
          </Stack>

          <Stack spacing={1.5}>
            <Label>Expense Form</Label>
            <SplitRequestExpenseSnapshotView expense={request.expense} />
          </Stack>
        </Box>

        {myMember?.status === "pending" ? (
          <Stack spacing={1.5} sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
            <Label>Claim Type*</Label>
            <Stack direction="row" spacing={2} sx={{ fontSize: "0.875rem" }}>
              {(
                [
                  { value: "standalone" as const, label: "Create New Claim" },
                  { value: "trip_linked" as const, label: "Link to Trip" },
                ] as const
              ).map((option) => (
                <Box component="label" key={option.value} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <input type="radio" name="split-respond-claim-type" checked={claimType === option.value} onChange={() => setClaimType(option.value)} />
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
