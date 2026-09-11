import { apiCall } from "@/utils/apiManager/apiManager";

export function deleteCategory(id: number): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/categories/${id}`, { method: "DELETE" });
}
