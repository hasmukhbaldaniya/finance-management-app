import { apiCall } from "@/utils/apiManager/apiManager";
import type { TripDetail } from "@/types/trip.type";

export function getTripDetail(id: number): Promise<{ trip: TripDetail }> {
  return apiCall<{ trip: TripDetail }>(`/trips/${id}`, { method: "GET" });
}
