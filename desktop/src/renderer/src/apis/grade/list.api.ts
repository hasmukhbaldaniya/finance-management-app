import { apiCall } from "@/utils/apiManager/apiManager";
import type { Grade, GradeSortBy, SortDirection } from "@/types/grade.type";

export type ListGradesParams = {
  search?: string;
  sortBy?: GradeSortBy;
  sortDir?: SortDirection;
  page?: number;
  pageSize?: number;
};

export function getGrades(params: ListGradesParams = {}): Promise<{ grades: Grade[]; hasMore: boolean }> {
  const query = new URLSearchParams();

  if (params.search) query.set("search", params.search);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDir) query.set("sortDir", params.sortDir);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  return apiCall<{ grades: Grade[]; hasMore: boolean }>(`/grades${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
  });
}
