import { apiCall } from "@/utils/apiManager/apiManager";
import type { TripListItem, TripStatus } from "@/types/trip.type";

export type ListTripsParams = {
  search?: string;
  tripStartDate?: string;
  createdDate?: string;
  status?: TripStatus;
  page?: number;
  pageSize?: number;
};

export function getTrips(params: ListTripsParams = {}): Promise<{ trips: TripListItem[]; hasMore: boolean }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.tripStartDate) query.set("tripStartDate", params.tripStartDate);
  if (params.createdDate) query.set("createdDate", params.createdDate);
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  return apiCall<{ trips: TripListItem[]; hasMore: boolean }>(`/trips${queryString ? `?${queryString}` : ""}`, { method: "GET" });
}
