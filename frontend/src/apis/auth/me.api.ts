import { apiCall } from "@/utils/apiManager/apiManager";
import type { AuthUser } from "@/types/auth.type";
import type { Organization } from "@/types/organization.type";

export function getMe(): Promise<{ user: AuthUser; organization: Organization | null; isOwner: boolean }> {
  return apiCall<{ user: AuthUser; organization: Organization | null; isOwner: boolean }>("/auth/me", {
    method: "GET",
  });
}
