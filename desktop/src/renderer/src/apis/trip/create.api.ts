import { postJson } from "@/utils/apiManager/apiManager";
import type { TripStatus } from "@/types/trip.type";

export type CreateTripPayload = {
  name: string;
  startAt: string;
  endAt: string;
  startCityId: number;
  endCityId: number;
};

export function createTrip(payload: CreateTripPayload): Promise<{ id: number; status: TripStatus; totalAmount: string }> {
  return postJson<{ id: number; status: TripStatus; totalAmount: string }>("/trips", payload);
}
