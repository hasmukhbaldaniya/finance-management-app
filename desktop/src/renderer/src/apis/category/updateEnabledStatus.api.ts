import { apiCall } from "@/utils/apiManager/apiManager";

export function updateCategoryEnabledStatus(id: number, isEnabled: boolean): Promise<{ category: { id: number; isEnabled: boolean } }> {
  return apiCall<{ category: { id: number; isEnabled: boolean } }>(`/categories/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isEnabled }),
  });
}
