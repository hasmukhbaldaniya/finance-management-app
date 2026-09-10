import { apiCall } from "@/utils/apiManager/apiManager";
import type { TripDetail, TripExpenseRow } from "@/types/trip.type";

export function getTripDetail(id: number): Promise<{ trip: TripDetail; expenses: TripExpenseRow[] }> {
  return apiCall<{ trip: TripDetail; expenses: TripExpenseRow[] }>(`/trips/${id}`, { method: "GET" });
}
