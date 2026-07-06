import { apiCall } from "@/utils/apiManager/apiManager";
import type { OrganizationMembership } from "@/types/organization.type";

export function getMyOrganizations(): Promise<{ organizations: OrganizationMembership[] }> {
  return apiCall<{ organizations: OrganizationMembership[] }>("/organizations/mine", { method: "GET" });
}
