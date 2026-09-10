// Ported from frontend/src/app/(private)/claims/[id]/manual/page.tsx.
// next/navigation's useParams -> react-router's useParams (identical shape).
import { useParams } from "react-router";
import { ClaimManualForm } from "@/components/claim/claim-manual-form";

export function ClaimManualEditScreen() {
  const params = useParams<{ id: string }>();
  return <ClaimManualForm mode="edit" claimId={Number(params.id)} />;
}
