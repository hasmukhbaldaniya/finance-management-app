import { apiCall } from "@/utils/apiManager/apiManager";
import type { EmployeeStatus } from "@/types/employee.type";

export function updateEmployeeStatus(
  employeeId: number,
  status: EmployeeStatus
): Promise<{ employee: { id: number; status: EmployeeStatus } }> {
  return apiCall<{ employee: { id: number; status: EmployeeStatus } }>(`/employees/${employeeId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
