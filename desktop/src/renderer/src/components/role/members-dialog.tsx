"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { getRoleMembers } from "@/apis/role";
import type { RoleMember } from "@/types/role.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

type RoleMembersDialogProps = {
  roleId: number | null;
  roleName: string;
  onOpenChange: (open: boolean) => void;
};

export function RoleMembersDialog({ roleId, roleName, onOpenChange }: RoleMembersDialogProps) {
  const [members, setMembers] = useState<RoleMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => {
    if (roleId === null) return;

    let isMounted = true;
    setMembers(null);
    setLoadError(undefined);

    getRoleMembers(roleId)
      .then(({ members: fetched }) => {
        if (isMounted) setMembers(fetched);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      });

    return () => {
      isMounted = false;
    };
  }, [roleId]);

  return (
    <Dialog open={roleId !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Members — {roleName}</DialogTitle>
        </DialogHeader>

        {loadError ? (
          <Typography variant="body2" color="error">
            {loadError}
          </Typography>
        ) : members ? (
          <Stack component="ul" spacing={1} sx={{ maxHeight: 320, overflowY: "auto", listStyle: "none", p: 0, m: 0 }}>
            {members.map((member) => (
              <Box component="li" key={member.id} sx={{ borderRadius: 1.5, border: 1, borderColor: "divider", px: 1.5, py: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {member.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {member.email}
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center", py: 3, fontSize: "0.875rem", color: "text.secondary" }}>
            <Spinner />
            Loading…
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
