import { apiCall } from "@/utils/apiManager/apiManager";
import type { EmployeeGender, EmployeeTitle } from "@/types/employee.type";

export type UpdateMyProfilePayload = {
  title: EmployeeTitle;
  firstName: string;
  lastName: string;
  dob?: string;
  gender: EmployeeGender;
  employeeCode?: string;
};

export function updateMyProfile(payload: UpdateMyProfilePayload): Promise<{ message: string }> {
  return apiCall<{ message: string }>("/employees/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
