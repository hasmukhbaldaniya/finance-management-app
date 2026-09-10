import { apiCall } from "@/utils/apiManager/apiManager";
import type { ClaimInvoiceFile } from "@/types/claim.type";

export function getInvoiceFiles(claimId: number): Promise<{ files: ClaimInvoiceFile[] }> {
  return apiCall<{ files: ClaimInvoiceFile[] }>(`/claims/${claimId}/invoice-files`, { method: "GET" });
}
