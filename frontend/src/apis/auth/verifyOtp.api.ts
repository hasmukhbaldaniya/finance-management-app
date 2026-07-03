import { postJson } from "@/utils/apiManager/apiManager";

export function verifyOtp(email: string, otp: string): Promise<{ resetToken: string }> {
  return postJson<{ resetToken: string }>("/auth/forgot-password/verify-otp", { email, otp });
}
