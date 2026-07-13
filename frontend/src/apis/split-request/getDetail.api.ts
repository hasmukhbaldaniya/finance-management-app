import { apiCall } from "@/utils/apiManager/apiManager";
import type { SplitRequestDetail } from "@/types/split-request.type";

export function getSplitRequestDetail(id: number): Promise<{ request: SplitRequestDetail }> {
  return apiCall<{ request: SplitRequestDetail }>(`/split-requests/${id}`, { method: "GET" });
}
