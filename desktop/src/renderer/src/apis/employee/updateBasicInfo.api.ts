import { apiCall } from "@/utils/apiManager/apiManager";
import type { EmployeeBasicInfo, EmployeeGender, EmployeeTitle } from "@/types/employee.type";

export type UpdateBasicInfoPayload = {
  title: EmployeeTitle;
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  contactNumber: string;
  dob?: string;
  gender: EmployeeGender;
  employeeCode?: string;
};

export function updateEmployeeBasicInfo(
  employeeId: number,
  payload: UpdateBasicInfoPayload
): Promise<{ employee: EmployeeBasicInfo }> {
  return apiCall<{ employee: EmployeeBasicInfo }>(`/employees/${employeeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
