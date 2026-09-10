import { postJson } from "@/utils/apiManager/apiManager";

export function sendOnboardingMobileOtp(token: string): Promise<{ message: string }> {
  return postJson<{ message: string }>("/employee-onboarding/mobile-otp", { token });
}
