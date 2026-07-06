import { postJson } from "@/utils/apiManager/apiManager";
import type { Role } from "@/types/role.type";
import type { PrivilegeKey } from "@/utils/constants/privilege.constant";

export function createRole(name: string, privileges: PrivilegeKey[]): Promise<{ role: Role }> {
  return postJson<{ role: Role }>("/roles", { name, privileges });
}
