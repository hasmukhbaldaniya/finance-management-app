"use client";

import { useRouter } from "next/navigation";
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
    <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
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
    </div>
  );
}
