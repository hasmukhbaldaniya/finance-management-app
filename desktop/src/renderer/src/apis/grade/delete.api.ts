import { apiCall } from "@/utils/apiManager/apiManager";

export function deleteGrade(id: number): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/grades/${id}`, { method: "DELETE" });
}
