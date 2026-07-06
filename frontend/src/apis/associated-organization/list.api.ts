import { apiCall } from "@/utils/apiManager/apiManager";
import type {
  AssociatedOrganization,
  AssociatedOrganizationSortBy,
  RegistrationsLabel,
  SortDirection,
} from "@/types/associated-organization.type";

export type ListAssociatedOrganizationsParams = {
  registrations?: RegistrationsLabel[];
  status?: Array<"Active" | "Disabled">;
  organizationName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  sortBy?: AssociatedOrganizationSortBy;
  sortDir?: SortDirection;
  page?: number;
  pageSize?: number;
};

export function getAssociatedOrganizations(
  params: ListAssociatedOrganizationsParams = {}
): Promise<{ associatedOrganizations: AssociatedOrganization[]; hasMore: boolean }> {
  const query = new URLSearchParams();

  if (params.registrations?.length) query.set("registrations", params.registrations.join(","));
  if (params.status?.length) query.set("status", params.status.join(","));
  if (params.organizationName) query.set("organizationName", params.organizationName);
  if (params.contactName) query.set("contactName", params.contactName);
  if (params.contactEmail) query.set("contactEmail", params.contactEmail);
  if (params.contactPhone) query.set("contactPhone", params.contactPhone);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDir) query.set("sortDir", params.sortDir);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  return apiCall<{ associatedOrganizations: AssociatedOrganization[]; hasMore: boolean }>(
    `/associated-organizations${queryString ? `?${queryString}` : ""}`,
    { method: "GET" }
  );
}
