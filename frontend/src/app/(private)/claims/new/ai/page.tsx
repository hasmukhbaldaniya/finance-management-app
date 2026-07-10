"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClaim, processInvoiceFiles, uploadInvoiceFiles } from "@/apis/claim";
import { InvoiceFileDropzone } from "@/components/claim/invoice-file-dropzone";
import { TripSelect, type TripSelectValue } from "@/components/claim/trip-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { MAX_CLAIM_NAME_LENGTH } from "@/utils/constants/claim.constant";
import { ROUTES } from "@/utils/constants/route.constant";
import type { ClaimType } from "@/types/claim.type";

// 023's Step 1 — Claim Type/Name/Trip (identical to 022's own fields) plus
// the invoice upload. "Save & Next" persists the claim shell, uploads every
// file, kicks off AI processing, then advances to the pipeline/review
// screen.
export default function NewAiClaimPage() {
  const router = useRouter();
  const [claimType, setClaimType] = useState<ClaimType>("standalone");
  const [name, setName] = useState("");
  const [trip, setTrip] = useState<TripSelectValue | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleCancel(): void {
    router.push(ROUTES.CLAIMS);
  }

  async function handleSaveAndNext(): Promise<void> {
    if (claimType === "standalone" && !name.trim()) {
      toast.error("Claim Name is required.");
      return;
    }
    if (claimType === "trip_linked" && !trip) {
      toast.error("Select a trip.");
      return;
    }
    if (files.length === 0) {
      toast.error("Upload at least one invoice.");
      return;
    }

    setIsSubmitting(true);
    try {
      const claim = await createClaim({
        claimType,
        name: claimType === "standalone" ? name.trim() : undefined,
        tripId: claimType === "trip_linked" ? (trip?.id ?? undefined) : undefined,
        isDraftSave: true,
        creationMethod: "ai",
      });
      await uploadInvoiceFiles(claim.id, files);
      await processInvoiceFiles(claim.id);
      router.push(ROUTES.claimAiReview(claim.id));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Automated Extraction</h1>

      <div className="space-y-3">
        <Label>Claim Type</Label>
        <div className="flex gap-4 text-sm">
          {(
            [
              { value: "standalone" as const, label: "Create New Claim" },
              { value: "trip_linked" as const, label: "Link to Trip" },
            ] as const
          ).map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input type="radio" name="claim-type" checked={claimType === option.value} onChange={() => setClaimType(option.value)} />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {claimType === "standalone" ? (
        <div className="max-w-md space-y-2">
          <Label htmlFor="claim-name">Claim Name</Label>
          <Input id="claim-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={MAX_CLAIM_NAME_LENGTH} />
        </div>
      ) : (
        <div className="max-w-md space-y-2">
          <Label>Trip Name</Label>
          <TripSelect value={trip} onChange={setTrip} placeholder="Select trip" />
        </div>
      )}

      <div className="space-y-2">
        <Label>Invoices</Label>
        <InvoiceFileDropzone files={files} onChange={setFiles} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={isSubmitting} onClick={handleSaveAndNext}>
          {isSubmitting ? <Spinner /> : null}
          Save & Next
        </Button>
      </div>
    </div>
  );
}
