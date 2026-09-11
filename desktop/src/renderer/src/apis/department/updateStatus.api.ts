import { apiCall } from "@/utils/apiManager/apiManager";
import type { Department } from "@/types/department.type";

export function updateDepartmentStatus(id: number, isActive: boolean): Promise<{ department: Department }> {
  return apiCall<{ department: Department }>(`/departments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}
