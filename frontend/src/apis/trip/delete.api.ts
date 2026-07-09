import { apiCall } from "@/utils/apiManager/apiManager";

export function deleteTrip(id: number): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/trips/${id}`, { method: "DELETE" });
}
