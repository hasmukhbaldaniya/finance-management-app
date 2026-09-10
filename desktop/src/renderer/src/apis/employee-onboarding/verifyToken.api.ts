import { postJson } from "@/utils/apiManager/apiManager";
import type { EmployeeTitle } from "@/types/employee.type";

export type VerifyOnboardingTokenResponse = {
  email: string;
  title: EmployeeTitle | null;
  firstName: string;
  lastName: string;
};

export function verifyOnboardingToken(token: string): Promise<VerifyOnboardingTokenResponse> {
  return postJson<VerifyOnboardingTokenResponse>("/employee-onboarding/verify-token", { token });
}
