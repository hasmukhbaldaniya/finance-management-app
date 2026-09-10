import { uploadFile } from "@/utils/apiManager/apiManager";
import type { BulkUploadSummary } from "@/types/employee.type";

export function uploadBulkImport(file: File): Promise<BulkUploadSummary> {
  const formData = new FormData();
  formData.append("file", file);
  return uploadFile<BulkUploadSummary>("/employees/bulk/upload", formData);
}
