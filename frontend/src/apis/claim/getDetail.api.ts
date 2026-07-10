import { apiCall } from "@/utils/apiManager/apiManager";
import type { ClaimDetail } from "@/types/claim.type";

export function getClaimDetail(id: number): Promise<{ claim: ClaimDetail }> {
  return apiCall<{ claim: ClaimDetail }>(`/claims/${id}`, { method: "GET" });
}
