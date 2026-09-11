import { postJson } from "@/utils/apiManager/apiManager";

export function verifyRegistrationMobileOtp(registrationToken: string, otp: string): Promise<{ message: string }> {
  return postJson<{ message: string }>("/auth/registrations/mobile-otp/verify", { registrationToken, otp });
}
