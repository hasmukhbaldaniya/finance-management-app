import { downloadFile } from "@/utils/apiManager/apiManager";

export function downloadBulkImportErrors(uploadId: number): Promise<Blob> {
  return downloadFile(`/employees/bulk/${uploadId}/errors`);
}
