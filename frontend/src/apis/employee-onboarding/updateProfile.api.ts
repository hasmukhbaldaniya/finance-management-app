import { postJson } from "@/utils/apiManager/apiManager";
import type { EmployeeTitle } from "@/types/employee.type";

export function updateOnboardingProfile(
  token: string,
  title: EmployeeTitle,
  firstName: string,
  lastName: string
): Promise<{ message: string }> {
  return postJson<{ message: string }>("/employee-onboarding/profile", { token, title, firstName, lastName });
}
