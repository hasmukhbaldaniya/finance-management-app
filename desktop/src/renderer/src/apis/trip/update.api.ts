import { apiCall } from "@/utils/apiManager/apiManager";
import type { TripStatus } from "@/types/trip.type";
import type { CreateTripPayload } from "./create.api";

export function updateTrip(id: number, payload: CreateTripPayload): Promise<{ id: number; status: TripStatus; totalAmount: string }> {
  return apiCall<{ id: number; status: TripStatus; totalAmount: string }>(`/trips/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
