import { apiCall } from "@/utils/apiManager/apiManager";
import type { ClaimListItem } from "@/types/claim.type";

export type ListClaimsParams = {
  search?: string;
  createdDate?: string;
  status?: string;
  splitOrigin?: boolean;
  page?: number;
  pageSize?: number;
};

export function getClaims(params: ListClaimsParams = {}): Promise<{ claims: ClaimListItem[]; hasMore: boolean }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.createdDate) query.set("createdDate", params.createdDate);
  if (params.status) query.set("status", params.status);
  if (params.splitOrigin !== undefined) query.set("splitOrigin", String(params.splitOrigin));
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  return apiCall<{ claims: ClaimListItem[]; hasMore: boolean }>(`/claims${queryString ? `?${queryString}` : ""}`, { method: "GET" });
}
