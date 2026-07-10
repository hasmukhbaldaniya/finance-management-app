"use client";

import { useParams } from "next/navigation";
import { AiReviewScreen } from "@/components/claim/ai-review-screen";

export default function AiReviewPage() {
  const params = useParams<{ id: string }>();
  return <AiReviewScreen claimId={Number(params.id)} />;
}
