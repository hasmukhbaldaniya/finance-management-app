import { apiCall } from "@/utils/apiManager/apiManager";

export function deleteClaim(id: number): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/claims/${id}`, { method: "DELETE" });
}
