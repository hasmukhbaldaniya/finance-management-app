import { postJson } from "@/utils/apiManager/apiManager";

export function verifyRegistrationEmailOtp(email: string, otp: string): Promise<{ registrationToken: string }> {
  return postJson<{ registrationToken: string }>("/auth/registrations/email-otp/verify", { email, otp });
}
