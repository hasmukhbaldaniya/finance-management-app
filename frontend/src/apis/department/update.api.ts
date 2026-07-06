import { apiCall } from "@/utils/apiManager/apiManager";
import type { Department } from "@/types/department.type";

export function updateDepartment(id: number, name: string): Promise<{ department: Department }> {
  return apiCall<{ department: Department }>(`/departments/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}
