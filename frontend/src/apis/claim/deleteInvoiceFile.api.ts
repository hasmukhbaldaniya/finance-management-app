import { apiCall } from "@/utils/apiManager/apiManager";

export function deleteInvoiceFile(claimId: number, fileId: number): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/claims/${claimId}/invoice-files/${fileId}`, { method: "DELETE" });
}
