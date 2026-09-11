import { apiCall } from "@/utils/apiManager/apiManager";

export function setRegistrationMobile(registrationToken: string, mobileNumber: string): Promise<{ message: string }> {
  return apiCall<{ message: string }>("/auth/registrations/mobile", {
    method: "PUT",
    body: JSON.stringify({ registrationToken, mobileNumber }),
  });
}
