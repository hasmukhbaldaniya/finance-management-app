// Ported from frontend/src/app/(private)/claims/[id]/ai-review/page.tsx.
// next/navigation's useParams -> react-router's useParams (identical shape).
import { useParams } from "react-router";
import { AiReviewScreen } from "@/components/claim/ai-review-screen";

export function ClaimAiReviewScreen() {
  const params = useParams<{ id: string }>();
  return <AiReviewScreen claimId={Number(params.id)} />;
}
