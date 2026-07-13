"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
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
    <Stack spacing={4} sx={{ mx: "auto", maxWidth: 768, px: 3, py: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
        Automated Extraction
      </Typography>

      <Stack spacing={1.5}>
        <Label>Claim Type</Label>
        <Stack direction="row" spacing={2} sx={{ fontSize: "0.875rem" }}>
          {(
            [
              { value: "standalone" as const, label: "Create New Claim" },
              { value: "trip_linked" as const, label: "Link to Trip" },
            ] as const
          ).map((option) => (
            <Box component="label" key={option.value} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <input type="radio" name="claim-type" checked={claimType === option.value} onChange={() => setClaimType(option.value)} />
              {option.label}
            </Box>
          ))}
        </Stack>
      </Stack>

      {claimType === "standalone" ? (
        <Stack spacing={1} sx={{ maxWidth: 448 }}>
          <Label htmlFor="claim-name">Claim Name</Label>
          <Input id="claim-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={MAX_CLAIM_NAME_LENGTH} />
        </Stack>
      ) : (
        <Stack spacing={1} sx={{ maxWidth: 448 }}>
          <Label>Trip Name</Label>
          <TripSelect value={trip} onChange={setTrip} placeholder="Select trip" />
        </Stack>
      )}

      <Stack spacing={1}>
        <Label>Invoices</Label>
        <InvoiceFileDropzone files={files} onChange={setFiles} />
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", borderTop: 1, borderColor: "divider", pt: 3 }}>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={isSubmitting} onClick={handleSaveAndNext}>
          {isSubmitting ? <Spinner /> : null}
          Save & Next
        </Button>
      </Stack>
    </Stack>
  );
}
