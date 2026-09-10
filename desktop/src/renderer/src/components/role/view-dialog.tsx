"use client";

import Stack from "@mui/material/Stack";
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

        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Label htmlFor="role-view-name">Role Name</Label>
            <Input id="role-view-name" value={role?.name ?? ""} disabled />
          </Stack>

          <Stack spacing={0.75}>
            <Label>Privileges</Label>
            <PrivilegeCheckboxList selected={role?.privileges ?? []} disabled />
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
