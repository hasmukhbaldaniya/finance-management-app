"use client";

import { useParams } from "next/navigation";
import { ClaimManualForm } from "@/components/claim/claim-manual-form";

export default function EditManualClaimPage() {
  const params = useParams<{ id: string }>();
  return <ClaimManualForm mode="edit" claimId={Number(params.id)} />;
}
