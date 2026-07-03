import { apiCall } from "@/utils/apiManager/apiManager";
import type { AuthUser } from "@/types/auth.type";

export function login(identifier: string, password: string): Promise<{ user: AuthUser }> {
  return apiCall<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}
