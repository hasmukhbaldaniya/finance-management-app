import { apiCall } from "@/utils/apiManager/apiManager";
import type { Department, DepartmentSortBy, SortDirection } from "@/types/department.type";

export type ListDepartmentsParams = {
  search?: string;
  sortBy?: DepartmentSortBy;
  sortDir?: SortDirection;
  page?: number;
  pageSize?: number;
};

export function getDepartments(
  params: ListDepartmentsParams = {}
): Promise<{ departments: Department[]; hasMore: boolean }> {
  const query = new URLSearchParams();

  if (params.search) query.set("search", params.search);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDir) query.set("sortDir", params.sortDir);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  return apiCall<{ departments: Department[]; hasMore: boolean }>(
    `/departments${queryString ? `?${queryString}` : ""}`,
    { method: "GET" }
  );
}
