import { apiCall } from "@/utils/apiManager/apiManager";
import type { SplitRequestListItem } from "@/types/split-request.type";

export type ListSplitRequestsParams = {
  search?: string;
  requestedOn?: string;
  page?: number;
  pageSize?: number;
};

// scope=received (the inbox 025's own reference screenshots show) — there's
// no "sent" tab in this app yet, so that scope isn't wired up here.
export function getSplitRequests(params: ListSplitRequestsParams = {}): Promise<{ requests: SplitRequestListItem[]; hasMore: boolean }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.requestedOn) query.set("requestedOn", params.requestedOn);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  return apiCall<{ requests: SplitRequestListItem[]; hasMore: boolean }>(`/split-requests${queryString ? `?${queryString}` : ""}`, { method: "GET" });
}
