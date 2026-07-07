import { apiCall } from "@/utils/apiManager/apiManager";
import type { EmployeeBasicInfo, EmployeeInvitationStatus, EmployeeStatus } from "@/types/employee.type";

export type EmployeeDetail = EmployeeBasicInfo & {
  status: EmployeeStatus;
  invitationStatus: EmployeeInvitationStatus;
  roleId: number | null;
  departmentId: number | null;
  gradeId: number | null;
  projectIds: number[];
  ffNumbers: { airlineId: number; ffNumber: string }[];
  approvers: { level: number; approverEmployeeId: number }[];
};

export function getEmployeeDetail(employeeId: number): Promise<{ employee: EmployeeDetail }> {
  return apiCall<{ employee: EmployeeDetail }>(`/employees/${employeeId}`, { method: "GET" });
}
