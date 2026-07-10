"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteInvoiceFile } from "@/apis/claim";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import type { ClaimInvoiceFile } from "@/types/claim.type";

type DeleteInvoiceFileDialogProps = {
  claimId: number;
  file: ClaimInvoiceFile | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
};

// Removing an invoice (Step 1 before upload, or Step 2 here) takes its
// derived expense(s) with it — a real, hard-to-undo action (re-extracting
// means re-uploading), so this confirms first, same posture as every other
// delete in this codebase.
export function DeleteInvoiceFileDialog({ claimId, file, onOpenChange, onDeleted }: DeleteInvoiceFileDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    if (!file) return;
    setIsSubmitting(true);
    try {
      await deleteInvoiceFile(claimId, file.id);
      toast.success("Invoice removed.");
      onDeleted();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={file !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Invoice?</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove &ldquo;{file?.originalFileName}&rdquo;? Its extracted expense will be removed too. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            No
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            Yes, Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
