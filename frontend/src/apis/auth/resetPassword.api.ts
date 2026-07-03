import { postJson } from "@/utils/apiManager/apiManager";

export function resetPassword(resetToken: string, newPassword: string): Promise<{ message: string }> {
  return postJson<{ message: string }>("/auth/forgot-password/reset-password", { resetToken, newPassword });
}
