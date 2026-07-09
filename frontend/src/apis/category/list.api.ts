import { apiCall } from "@/utils/apiManager/apiManager";
import type { CategoryListItem } from "@/types/category.type";

export type ListCategoriesParams = {
  page?: number;
  pageSize?: number;
};

export function getCategories(params: ListCategoriesParams = {}): Promise<{ categories: CategoryListItem[]; hasMore: boolean }> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  return apiCall<{ categories: CategoryListItem[]; hasMore: boolean }>(`/categories${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
  });
}
