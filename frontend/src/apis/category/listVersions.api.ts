import { apiCall } from "@/utils/apiManager/apiManager";
import type { CategoryVersionsResponse } from "@/types/category.type";

export function getCategoryVersions(id: number): Promise<CategoryVersionsResponse> {
  return apiCall<CategoryVersionsResponse>(`/categories/${id}/versions`, { method: "GET" });
}
