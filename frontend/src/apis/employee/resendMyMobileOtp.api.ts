import { postJson } from "@/utils/apiManager/apiManager";

export function resendMyMobileOtp(): Promise<{ message: string }> {
  return postJson<{ message: string }>("/employees/me/mobile-otp");
}
