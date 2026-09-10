import { postJson } from "@/utils/apiManager/apiManager";

export function resendRegistrationEmailOtp(email: string): Promise<{ message: string }> {
  return postJson<{ message: string }>("/auth/registrations/email-otp/resend", { email });
}
