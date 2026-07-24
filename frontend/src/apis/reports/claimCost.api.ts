import { apiCall } from "@/utils/apiManager/apiManager";
import type { ClaimCostRow } from "@/types/report.type";
import type { ClaimStatus } from "@/types/claim.type";

export type ClaimCostParams = {
  from?: string;
  to?: string;
  status?: ClaimStatus | "";
};

export function getClaimCostReport(params: ClaimCostParams = {}): Promise<{ rows: ClaimCostRow[] }> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.status) query.set("status", params.status);

  const queryString = query.toString();
  return apiCall<{ rows: ClaimCostRow[] }>(`/reports/claim-cost${queryString ? `?${queryString}` : ""}`, { method: "GET" });
}
