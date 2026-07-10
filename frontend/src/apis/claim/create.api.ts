import { postJson } from "@/utils/apiManager/apiManager";
import type { ClaimCreationMethod, ClaimStatus, ClaimType } from "@/types/claim.type";

export type CreateClaimPayload = {
  claimType: ClaimType;
  name?: string;
  tripId?: number;
  isDraftSave: boolean;
  creationMethod?: ClaimCreationMethod;
};

export function createClaim(payload: CreateClaimPayload): Promise<{ id: number; status: ClaimStatus }> {
  return postJson<{ id: number; status: ClaimStatus }>("/claims", payload);
}
