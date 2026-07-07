import { apiCall } from "@/utils/apiManager/apiManager";
import type { Airline } from "@/types/airline.type";

export function getAirlines(): Promise<{ airlines: Airline[] }> {
  return apiCall<{ airlines: Airline[] }>("/airlines", { method: "GET" });
}
