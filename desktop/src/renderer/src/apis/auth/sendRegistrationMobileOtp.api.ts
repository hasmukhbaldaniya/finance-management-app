import { postJson } from "@/utils/apiManager/apiManager";

export function sendRegistrationMobileOtp(registrationToken: string): Promise<{ message: string }> {
  return postJson<{ message: string }>("/auth/registrations/mobile-otp", { registrationToken });
}
