import { postJson } from "@/utils/apiManager/apiManager";

export function processInvoiceFiles(claimId: number): Promise<{ message: string }> {
  return postJson(`/claims/${claimId}/process`, {});
}
