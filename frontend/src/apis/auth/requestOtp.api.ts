import { apiCall } from "@/utils/apiManager/apiManager";

export function requestOtp(email: string): Promise<{ message: string }> {
  return apiCall<{ message: string }>("/auth/forgot-password/request-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
