import { apiCall } from "@/utils/apiManager/apiManager";

export function logout(): Promise<{ message: string }> {
  return apiCall<{ message: string }>("/auth/logout", { method: "POST" });
}
