import { downloadFile } from "@/utils/apiManager/apiManager";

export function downloadBulkTemplate(): Promise<Blob> {
  return downloadFile("/employees/bulk/template");
}
