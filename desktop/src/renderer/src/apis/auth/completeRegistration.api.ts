import { postJson } from "@/utils/apiManager/apiManager";
import type { AuthUser } from "@/types/auth.type";
import type { Organization } from "@/types/organization.type";

export type CompleteRegistrationResponse = {
  user: AuthUser;
  organization: Organization;
  accessToken: string;
  refreshToken: string;
};

export function completeRegistration(registrationToken: string): Promise<CompleteRegistrationResponse> {
  return postJson<CompleteRegistrationResponse>("/auth/registrations/complete", { registrationToken });
}
