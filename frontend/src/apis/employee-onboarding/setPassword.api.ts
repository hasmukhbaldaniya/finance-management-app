import { postJson } from "@/utils/apiManager/apiManager";

export function setOnboardingPassword(token: string, password: string): Promise<{ message: string }> {
  return postJson<{ message: string }>("/employee-onboarding/password", { token, password });
}
