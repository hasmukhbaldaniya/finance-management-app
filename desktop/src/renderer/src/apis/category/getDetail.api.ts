import { apiCall } from "@/utils/apiManager/apiManager";
import type { CategorySnapshot } from "@/types/category.type";

export function getCategoryDetail(id: number): Promise<{ category: CategorySnapshot }> {
  return apiCall<{ category: CategorySnapshot }>(`/categories/${id}`, { method: "GET" });
}
