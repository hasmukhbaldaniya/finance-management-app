import { apiCall } from "@/utils/apiManager/apiManager";
import type { Role } from "@/types/role.type";

export function updateRoleStatus(id: number, isActive: boolean): Promise<{ role: Role }> {
  return apiCall<{ role: Role }>(`/roles/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}
