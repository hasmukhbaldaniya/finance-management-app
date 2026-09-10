import { apiCall } from "@/utils/apiManager/apiManager";

export function updateAssociatedOrganizationStatus(
  id: number,
  isActive: boolean
): Promise<{ associatedOrganization: { id: number; isActive: boolean } }> {
  return apiCall<{ associatedOrganization: { id: number; isActive: boolean } }>(
    `/associated-organizations/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }
  );
}
