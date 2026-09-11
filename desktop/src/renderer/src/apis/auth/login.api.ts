import { postJson } from "@/utils/apiManager/apiManager";
import type { AuthUser } from "@/types/auth.type";

export function login(identifier: string, password: string): Promise<{ user: AuthUser }> {
  return postJson<{ user: AuthUser }>("/auth/login", { identifier, password });
}
