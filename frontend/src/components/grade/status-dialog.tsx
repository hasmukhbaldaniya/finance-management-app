"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { updateGradeStatus } from "@/apis/grade";
import type { Grade } from "@/types/grade.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

type GradeStatusDialogProps = {
  grade: Grade | null;
  onOpenChange: (open: boolean) => void;
  onStatusChanged: (grade: Grade) => void;
};

export function GradeStatusDialog({ grade, onOpenChange, onStatusChanged }: GradeStatusDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    if (!grade) return;
    const nextIsActive = !grade.isActive;

    setIsSubmitting(true);
    try {
      const { grade: updated } = await updateGradeStatus(grade.id, nextIsActive);
      onStatusChanged(updated);
      toast.success(nextIsActive ? "Grade enabled." : "Grade disabled.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  const actionLabel = grade?.isActive ? "Disable" : "Enable";

  return (
    <Dialog open={grade !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionLabel} this grade?</DialogTitle>
          <DialogDescription>
            {grade?.isActive
              ? "Members already assigned to this grade will keep it, but it won't be offered for new assignments."
              : "This grade will be available again."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={grade?.isActive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner /> : null}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
