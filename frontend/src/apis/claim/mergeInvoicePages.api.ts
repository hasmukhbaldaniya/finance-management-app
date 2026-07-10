import { postJson } from "@/utils/apiManager/apiManager";

export function mergeInvoicePages(claimId: number, fileId: number, pageNumbers: number[]): Promise<{ message: string }> {
  return postJson(`/claims/${claimId}/invoice-files/${fileId}/merge`, { pageNumbers });
}
