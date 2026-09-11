import { apiCall } from "@/utils/apiManager/apiManager";

export function getGstAvailability(gstNumber: string): Promise<{ available: boolean }> {
  return apiCall<{ available: boolean }>(`/organizations/gst-availability?gstNumber=${encodeURIComponent(gstNumber)}`, {
    method: "GET",
  });
}
