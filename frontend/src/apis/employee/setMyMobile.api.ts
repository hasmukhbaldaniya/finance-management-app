import { apiCall } from "@/utils/apiManager/apiManager";

export function setMyMobile(countryCode: string, contactNumber: string): Promise<{ message: string }> {
  return apiCall<{ message: string }>("/employees/me/mobile", {
    method: "PUT",
    body: JSON.stringify({ countryCode, contactNumber }),
  });
}
