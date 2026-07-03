import { apiCall } from "@/utils/apiManager/apiManager";
import type { AuthUser } from "@/types/auth.type";

export function getMe(): Promise<{ user: AuthUser }> {
  return apiCall<{ user: AuthUser }>("/auth/me", { method: "GET" });
}
