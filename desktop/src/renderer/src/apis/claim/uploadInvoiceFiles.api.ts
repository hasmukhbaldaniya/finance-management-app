import { uploadFile } from "@/utils/apiManager/apiManager";
import type { ClaimInvoiceFile } from "@/types/claim.type";

// `failed` — 023's own Edge Cases: a corrupted/password-protected file is
// flagged rather than blocking the rest of the batch, so this call can
// partially succeed (some files land in `files`, the rest in `failed`).
export function uploadInvoiceFiles(claimId: number, files: File[]): Promise<{ files: ClaimInvoiceFile[]; failed: { originalFileName: string }[] }> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return uploadFile<{ files: ClaimInvoiceFile[]; failed: { originalFileName: string }[] }>(`/claims/${claimId}/invoice-files`, formData);
}
