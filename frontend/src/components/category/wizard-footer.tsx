"use client";

import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/utils/constants/route.constant";

type WizardFooterProps = {
  showSaveAsDraft: boolean;
  primaryLabel: string;
  isSavingDraft: boolean;
  isSavingPrimary: boolean;
  onSaveAsDraft: () => void;
  onPrimary: () => void;
};

// Shared Cancel / Save as Draft / primary-action row for every wizard step —
// per 013's Shared Behavior, Save as Draft only ever renders while the
// category is still "draft" (callers pass showSaveAsDraft accordingly).
export function WizardFooter({ showSaveAsDraft, primaryLabel, isSavingDraft, isSavingPrimary, onSaveAsDraft, onPrimary }: WizardFooterProps) {
  const router = useRouter();
  const isBusy = isSavingDraft || isSavingPrimary;

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "flex-end", borderTop: 1, borderColor: "divider", pt: 3 }}>
      <Button type="button" variant="outline" disabled={isBusy} onClick={() => router.push(ROUTES.COMPANY_SETTINGS.CATEGORIES)}>
        Cancel
      </Button>
      {showSaveAsDraft ? (
        <Button type="button" variant="secondary" disabled={isBusy} onClick={onSaveAsDraft}>
          {isSavingDraft ? <Spinner size={16} /> : null}
          Save as Draft
        </Button>
      ) : null}
      <Button type="button" disabled={isBusy} onClick={onPrimary}>
        {isSavingPrimary ? <Spinner size={16} /> : null}
        {primaryLabel}
      </Button>
    </Stack>
  );
}
