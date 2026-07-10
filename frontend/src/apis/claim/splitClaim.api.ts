import { postJson } from "@/utils/apiManager/apiManager";
import type { ClaimType } from "@/types/claim.type";

export type SplitClaimPayload = {
  expenseIds: number[];
  newClaim: { claimType: ClaimType; name?: string; tripId?: number };
};

export function splitClaim(claimId: number, payload: SplitClaimPayload): Promise<{ originalClaimId: number; newClaimId: number; message: string }> {
  return postJson(`/claims/${claimId}/split`, payload);
}
