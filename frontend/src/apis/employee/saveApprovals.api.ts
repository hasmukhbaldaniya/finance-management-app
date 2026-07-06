import { apiCall } from "@/utils/apiManager/apiManager";
import type { ModuleAccessKey } from "@/types/employee.type";

export type SaveApprovalsPayload = {
  moduleAccess: ModuleAccessKey[];
  approvers: { level: number; approverEmployeeId: number }[];
};

export function saveEmployeeApprovals(employeeId: number, payload: SaveApprovalsPayload): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/employees/${employeeId}/approvals`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
