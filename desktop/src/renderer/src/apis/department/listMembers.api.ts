import { apiCall } from "@/utils/apiManager/apiManager";
import type { DepartmentMember } from "@/types/department.type";

export function getDepartmentMembers(id: number): Promise<{ members: DepartmentMember[] }> {
  return apiCall<{ members: DepartmentMember[] }>(`/departments/${id}/members`, { method: "GET" });
}
