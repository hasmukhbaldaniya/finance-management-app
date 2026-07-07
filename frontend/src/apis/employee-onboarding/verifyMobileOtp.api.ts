import { postJson } from "@/utils/apiManager/apiManager";

export function verifyOnboardingMobileOtp(token: string, otp: string): Promise<{ message: string }> {
  return postJson<{ message: string }>("/employee-onboarding/mobile-otp/verify", { token, otp });
}
