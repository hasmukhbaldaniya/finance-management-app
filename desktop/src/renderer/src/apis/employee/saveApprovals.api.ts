import { apiCall } from "@/utils/apiManager/apiManager";

export type SaveApprovalsPayload = {
  approvers: { level: number; approverEmployeeId: number }[];
};

export function saveEmployeeApprovals(employeeId: number, payload: SaveApprovalsPayload): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/employees/${employeeId}/approvals`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
