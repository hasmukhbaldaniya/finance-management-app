import { postJson } from "@/utils/apiManager/apiManager";
import type { AuthUser } from "@/types/auth.type";
import type { Organization } from "@/types/organization.type";

export type CompleteOnboardingResponse = {
  user: AuthUser;
  organization: Organization;
  accessToken: string;
  refreshToken: string;
};

export function completeOnboarding(token: string): Promise<CompleteOnboardingResponse> {
  return postJson<CompleteOnboardingResponse>("/employee-onboarding/complete", { token });
}
