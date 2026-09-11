import { apiCall } from "@/utils/apiManager/apiManager";

export function deleteDepartment(id: number): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/departments/${id}`, { method: "DELETE" });
}
