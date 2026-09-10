import { apiCall } from "@/utils/apiManager/apiManager";
import type { ClaimStatus, ClaimType } from "@/types/claim.type";

export type UpdateClaimPayload = {
  claimType: ClaimType;
  name?: string;
  tripId?: number;
  isDraftSave: boolean;
};

export function updateClaim(id: number, payload: UpdateClaimPayload): Promise<{ id: number; status: ClaimStatus }> {
  return apiCall<{ id: number; status: ClaimStatus }>(`/claims/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}
