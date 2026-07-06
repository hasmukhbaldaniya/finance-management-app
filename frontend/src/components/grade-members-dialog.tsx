"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { getGradeMembers } from "@/apis/grade";
import type { GradeMember } from "@/types/grade.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

type GradeMembersDialogProps = {
  gradeId: number | null;
  gradeName: string;
  onOpenChange: (open: boolean) => void;
};

export function GradeMembersDialog({ gradeId, gradeName, onOpenChange }: GradeMembersDialogProps) {
  const [members, setMembers] = useState<GradeMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => {
    if (gradeId === null) return;

    let isMounted = true;
    setMembers(null);
    setLoadError(undefined);

    getGradeMembers(gradeId)
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
  }, [gradeId]);

  return (
    <Dialog open={gradeId !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Members — {gradeName}</DialogTitle>
        </DialogHeader>

        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : members ? (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {members.map((member) => (
              <li key={member.id} className="rounded-md border border-border px-3 py-2">
                <p className="text-sm font-medium">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Spinner />
            Loading…
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
