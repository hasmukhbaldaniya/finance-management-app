"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrivilegeCheckboxList } from "./privilege-checkbox-list";
import type { Role } from "@/types/role.type";

type RoleViewDialogProps = {
  role: Role | null;
  onOpenChange: (open: boolean) => void;
};

export function RoleViewDialog({ role, onOpenChange }: RoleViewDialogProps) {
  return (
    <Dialog open={role !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{role?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="role-view-name">Role Name</Label>
            <Input id="role-view-name" value={role?.name ?? ""} disabled />
          </div>

          <div className="space-y-1.5">
            <Label>Privileges</Label>
            <PrivilegeCheckboxList selected={role?.privileges ?? []} disabled />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
