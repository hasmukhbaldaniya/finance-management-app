import { apiCall } from "@/utils/apiManager/apiManager";

export function resendEmployeeInvite(employeeId: number): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/employees/${employeeId}/resend`, { method: "POST" });
}
