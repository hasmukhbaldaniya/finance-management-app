import { apiCall } from "@/utils/apiManager/apiManager";
import type { Role, RoleSortBy, SortDirection } from "@/types/role.type";

export type ListRolesParams = {
  search?: string;
  sortBy?: RoleSortBy;
  sortDir?: SortDirection;
  page?: number;
  pageSize?: number;
};

export function getRoles(params: ListRolesParams = {}): Promise<{ roles: Role[]; hasMore: boolean }> {
  const query = new URLSearchParams();

  if (params.search) query.set("search", params.search);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDir) query.set("sortDir", params.sortDir);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  return apiCall<{ roles: Role[]; hasMore: boolean }>(`/roles${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
  });
}
