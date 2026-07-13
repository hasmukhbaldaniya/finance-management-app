import { postJson } from "@/utils/apiManager/apiManager";
import type { ClaimType } from "@/types/claim.type";

export type AcceptSplitRequestPayload = { claimType: ClaimType; name?: string; tripId?: number };

export function acceptSplitRequest(id: number, payload: AcceptSplitRequestPayload): Promise<{ newClaimId: number; message: string }> {
  return postJson(`/split-requests/${id}/accept`, payload);
}
