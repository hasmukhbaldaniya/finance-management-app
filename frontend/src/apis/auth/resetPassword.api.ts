import { apiCall } from "@/utils/apiManager/apiManager";

export function resetPassword(resetToken: string, newPassword: string): Promise<{ message: string }> {
  return apiCall<{ message: string }>("/auth/forgot-password/reset-password", {
    method: "POST",
    body: JSON.stringify({ resetToken, newPassword }),
  });
}
