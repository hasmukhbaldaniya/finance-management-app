import { apiCall } from "@/utils/apiManager/apiManager";
import type { Organization } from "@/types/organization.type";

export function switchActiveOrganization(organizationId: number): Promise<{ organization: Organization }> {
  return apiCall<{ organization: Organization }>("/users/me/active-organization", {
    method: "PATCH",
    body: JSON.stringify({ organizationId }),
  });
}
