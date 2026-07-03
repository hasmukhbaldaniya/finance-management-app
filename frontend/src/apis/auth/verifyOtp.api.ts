import { apiCall } from "@/utils/apiManager/apiManager";

export function verifyOtp(email: string, otp: string): Promise<{ resetToken: string }> {
  return apiCall<{ resetToken: string }>("/auth/forgot-password/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}
