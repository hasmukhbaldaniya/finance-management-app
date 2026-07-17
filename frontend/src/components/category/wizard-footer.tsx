"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { finishCategoryEditSession } from "@/apis/category";
import { useCategoryWizard } from "@/contexts/CategoryWizardContext";
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
  const wizard = useCategoryWizard();
  const [isCancelling, setIsCancelling] = useState(false);
  const isBusy = isSavingDraft || isSavingPrimary || isCancelling;

  // 016's versioning engine is only ever triggered two ways: Step 4's
  // draft→active transition, and this — an edit session on an *already*
  // active category ending. Cancel is the only "session end" signal this
  // wizard has (there's no separate explicit save-and-exit), so it's the
  // one place that can call finish-editing; a still-"draft" category has
  // nothing to version yet, so this only fires once status is "active".
  async function handleCancel(): Promise<void> {
    if (wizard.status === "active" && wizard.categoryId) {
      setIsCancelling(true);
      try {
        await finishCategoryEditSession(wizard.categoryId);
      } catch {
        // Best-effort — failing to record a version isn't worth blocking
        // Cancel over; the next successful edit session still versions
        // correctly since diffing is against the last stored snapshot.
      } finally {
        setIsCancelling(false);
      }
    }
    router.push(ROUTES.COMPANY_SETTINGS.CATEGORIES);
  }

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "flex-end", borderTop: 1, borderColor: "divider", pt: 3 }}>
      <Button type="button" variant="outline" disabled={isBusy} onClick={handleCancel}>
        {isCancelling ? <Spinner size={16} /> : null}
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
