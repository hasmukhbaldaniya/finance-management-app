// Ported from frontend/src/app/(private)/claims/[id]/manual/page.tsx.
// next/navigation's useParams -> react-router's useParams (identical shape).
import { useParams } from "react-router";
import { ClaimManualForm } from "@/components/claim/claim-manual-form";
import { useIdRemap } from "@/hooks/useIdRemap";
import { ROUTES } from "@/utils/constants/route.constant";

export function ClaimManualEditScreen() {
  const params = useParams<{ id: string }>();
  const claimId = Number(params.id);
  useIdRemap(claimId, ROUTES.claimManualEdit);
  return <ClaimManualForm mode="edit" claimId={claimId} />;
}
