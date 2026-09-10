import { postJson } from "@/utils/apiManager/apiManager";

export function verifyMyMobileOtp(otp: string): Promise<{ message: string }> {
  return postJson<{ message: string }>("/employees/me/mobile-otp/verify", { otp });
}
