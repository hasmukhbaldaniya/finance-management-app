import { apiCall } from "@/utils/apiManager/apiManager";
import type { ProcessingStatus } from "@/types/claim.type";

export function getProcessingStatus(claimId: number): Promise<ProcessingStatus> {
  return apiCall<ProcessingStatus>(`/claims/${claimId}/process-status`, { method: "GET" });
}
