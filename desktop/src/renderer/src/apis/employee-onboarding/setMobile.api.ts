import { apiCall } from "@/utils/apiManager/apiManager";

export function setOnboardingMobile(token: string, countryCode: string, contactNumber: string): Promise<{ message: string }> {
  return apiCall<{ message: string }>("/employee-onboarding/mobile", {
    method: "PUT",
    body: JSON.stringify({ token, countryCode, contactNumber }),
  });
}
