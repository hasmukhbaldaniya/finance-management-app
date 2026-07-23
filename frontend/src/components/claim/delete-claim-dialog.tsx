"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { deleteClaim } from "@/apis/claim";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { formatClaimName } from "@/utils/helpers/format.helper";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import type { ClaimListItem } from "@/types/claim.type";

type DeleteClaimDialogProps = {
  claim: ClaimListItem | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (claimId: number) => void;
};

export function DeleteClaimDialog({ claim, onOpenChange, onDeleted }: DeleteClaimDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    if (!claim) return;
    setIsSubmitting(true);
    try {
      await deleteClaim(claim.id);
      toast.success("Claim deleted.");
      onDeleted(claim.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={claim !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Claim?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{claim ? formatClaimName(claim) : ""}&rdquo;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            No
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            Yes, Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
