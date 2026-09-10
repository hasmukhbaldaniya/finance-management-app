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
import { updateDepartmentStatus } from "@/apis/department";
import type { Department } from "@/types/department.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

type DepartmentStatusDialogProps = {
  department: Department | null;
  onOpenChange: (open: boolean) => void;
  onStatusChanged: (department: Department) => void;
};

export function DepartmentStatusDialog({ department, onOpenChange, onStatusChanged }: DepartmentStatusDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    if (!department) return;
    const nextIsActive = !department.isActive;

    setIsSubmitting(true);
    try {
      const { department: updated } = await updateDepartmentStatus(department.id, nextIsActive);
      onStatusChanged(updated);
      toast.success(nextIsActive ? "Department enabled." : "Department disabled.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  const actionLabel = department?.isActive ? "Disable" : "Enable";

  return (
    <Dialog open={department !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionLabel} this department?</DialogTitle>
          <DialogDescription>
            {department?.isActive
              ? "Members already assigned to this department will keep it, but it won't be offered for new assignments."
              : "This department will be available again."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={department?.isActive ? "destructive" : "default"}
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
