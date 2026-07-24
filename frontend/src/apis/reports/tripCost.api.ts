import { apiCall } from "@/utils/apiManager/apiManager";
import type { TripCostRow } from "@/types/report.type";
import type { TripStatus } from "@/types/trip.type";

export type TripCostParams = {
  from?: string;
  to?: string;
  status?: TripStatus | "";
};

export function getTripCostReport(params: TripCostParams = {}): Promise<{ rows: TripCostRow[] }> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.status) query.set("status", params.status);

  const queryString = query.toString();
  return apiCall<{ rows: TripCostRow[] }>(`/reports/trip-cost${queryString ? `?${queryString}` : ""}`, { method: "GET" });
}
