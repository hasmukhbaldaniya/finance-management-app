import { uploadFile } from "@/utils/apiManager/apiManager";
import type { ClaimInvoiceFile } from "@/types/claim.type";

export function uploadInvoiceFiles(claimId: number, files: File[]): Promise<{ files: ClaimInvoiceFile[] }> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return uploadFile<{ files: ClaimInvoiceFile[] }>(`/claims/${claimId}/invoice-files`, formData);
}
