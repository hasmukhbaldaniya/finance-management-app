"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { updateRoleStatus } from "@/apis/role";
import type { Role } from "@/types/role.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

type RoleStatusDialogProps = {
  role: Role | null;
  onOpenChange: (open: boolean) => void;
  onStatusChanged: (role: Role) => void;
};

export function RoleStatusDialog({ role, onOpenChange, onStatusChanged }: RoleStatusDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    if (!role) return;
    const nextIsActive = !role.isActive;

    setIsSubmitting(true);
    try {
      const { role: updated } = await updateRoleStatus(role.id, nextIsActive);
      onStatusChanged(updated);
      toast.success(nextIsActive ? "Role enabled." : "Role disabled.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  const actionLabel = role?.isActive ? "Disable" : "Enable";

  return (
    <Dialog open={role !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionLabel} this role?</DialogTitle>
          <DialogDescription>
            {role?.isActive
              ? "Members already assigned to this role will keep it, but it won't be offered for new assignments."
              : "This role will be available again."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={role?.isActive ? "destructive" : "default"}
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
