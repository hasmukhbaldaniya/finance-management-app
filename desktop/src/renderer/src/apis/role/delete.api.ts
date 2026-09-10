import { apiCall } from "@/utils/apiManager/apiManager";

export function deleteRole(id: number): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/roles/${id}`, { method: "DELETE" });
}
