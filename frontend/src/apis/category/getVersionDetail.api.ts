import { apiCall } from "@/utils/apiManager/apiManager";
import type { CategoryVersionDetail } from "@/types/category.type";

export function getCategoryVersionDetail(id: number, version: string): Promise<CategoryVersionDetail> {
  return apiCall<CategoryVersionDetail>(`/categories/${id}/versions/${version}`, { method: "GET" });
}

export function getCategoryLatestVersion(id: number): Promise<CategoryVersionDetail> {
  return apiCall<CategoryVersionDetail>(`/categories/${id}/versions/latest`, { method: "GET" });
}
