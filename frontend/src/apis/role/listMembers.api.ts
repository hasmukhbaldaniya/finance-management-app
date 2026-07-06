import { apiCall } from "@/utils/apiManager/apiManager";
import type { RoleMember } from "@/types/role.type";

export function getRoleMembers(id: number): Promise<{ members: RoleMember[] }> {
  return apiCall<{ members: RoleMember[] }>(`/roles/${id}/members`, { method: "GET" });
}
