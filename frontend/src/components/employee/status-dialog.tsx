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
import { updateEmployeeStatus } from "@/apis/employee";
import type { EmployeeListItem } from "@/types/employee.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

type EmployeeStatusDialogProps = {
  employee: EmployeeListItem | null;
  onOpenChange: (open: boolean) => void;
  onStatusChanged: (employeeId: number, status: "active" | "suspended") => void;
};

// Only the Suspend direction opens this dialog — Activate applies immediately
// with no confirmation, since re-enabling access is the lower-risk direction
// (see 009's Flow). Callers only ever pass a non-null `employee` when the
// user clicked Suspend on an Active row.
export function EmployeeStatusDialog({ employee, onOpenChange, onStatusChanged }: EmployeeStatusDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    if (!employee) return;

    setIsSubmitting(true);
    try {
      const { employee: updated } = await updateEmployeeStatus(employee.id, "suspended");
      onStatusChanged(updated.id, updated.status);
      toast.success("Employee suspended.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={employee !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend Employee?</DialogTitle>
          <DialogDescription>
            {employee ? `${employee.firstName} ${employee.lastName}`.trim() : ""} will lose access to the platform until
            reactivated. Their record is kept, not deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            Suspend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
