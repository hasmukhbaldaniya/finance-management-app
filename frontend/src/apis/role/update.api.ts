import { apiCall } from "@/utils/apiManager/apiManager";
import type { Role } from "@/types/role.type";
import type { PrivilegeKey } from "@/utils/constants/privilege.constant";

export function updateRole(id: number, name: string, privileges: PrivilegeKey[]): Promise<{ role: Role }> {
  return apiCall<{ role: Role }>(`/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, privileges }),
  });
}
