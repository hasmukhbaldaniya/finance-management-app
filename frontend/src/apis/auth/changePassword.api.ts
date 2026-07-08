import { apiCall } from "@/utils/apiManager/apiManager";

export function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return apiCall<{ message: string }>("/auth/me/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
