import { postJson } from "@/utils/apiManager/apiManager";
import type { BulkImportResult } from "@/types/employee.type";

export function confirmBulkImport(uploadId: number): Promise<BulkImportResult> {
  return postJson<BulkImportResult>("/employees/bulk/import", { uploadId });
}
