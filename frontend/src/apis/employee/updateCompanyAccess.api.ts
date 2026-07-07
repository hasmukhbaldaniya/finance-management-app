import { apiCall } from "@/utils/apiManager/apiManager";

export type UpdateCompanyAccessPayload = {
  roleId: number;
  departmentId: number;
  gradeId: number;
  projectIds: number[];
};

export function updateEmployeeCompanyAccess(
  employeeId: number,
  payload: UpdateCompanyAccessPayload
): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/employees/${employeeId}/company-access`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
