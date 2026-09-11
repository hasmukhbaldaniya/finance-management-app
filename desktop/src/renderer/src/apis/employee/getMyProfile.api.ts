import { apiCall } from "@/utils/apiManager/apiManager";
import type { MyProfile } from "@/types/employee.type";

export function getMyProfile(): Promise<{ employee: MyProfile }> {
  return apiCall<{ employee: MyProfile }>("/employees/me", { method: "GET" });
}
