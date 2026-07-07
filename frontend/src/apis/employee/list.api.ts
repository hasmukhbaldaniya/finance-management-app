import { apiCall } from "@/utils/apiManager/apiManager";
import type { EmployeeListItem, EmployeeSortBy, EmployeeStatusFilterValue, SortDirection } from "@/types/employee.type";

export type ListEmployeesParams = {
  search?: string;
  status?: EmployeeStatusFilterValue[];
  sortBy?: EmployeeSortBy;
  sortDir?: SortDirection;
  page?: number;
  pageSize?: number;
};

export function getEmployees(params: ListEmployeesParams = {}): Promise<{ employees: EmployeeListItem[]; hasMore: boolean }> {
  const query = new URLSearchParams();

  if (params.search) query.set("search", params.search);
  if (params.status && params.status.length > 0) query.set("status", params.status.join(","));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDir) query.set("sortDir", params.sortDir);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  return apiCall<{ employees: EmployeeListItem[]; hasMore: boolean }>(`/employees${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
  });
}
