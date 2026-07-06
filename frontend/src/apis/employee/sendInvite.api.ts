import { apiCall } from "@/utils/apiManager/apiManager";

export function sendEmployeeInvite(employeeId: number): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/employees/${employeeId}/send-invite`, { method: "POST" });
}
