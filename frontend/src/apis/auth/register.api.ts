import { postJson } from "@/utils/apiManager/apiManager";

export type RegisterPayload = {
  organizationName: string;
  gstNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export function register(payload: RegisterPayload): Promise<{ message: string; email: string }> {
  return postJson<{ message: string; email: string }>("/auth/registrations", payload);
}
