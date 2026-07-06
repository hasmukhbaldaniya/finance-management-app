import { postJson } from "@/utils/apiManager/apiManager";
import type { EmployeeTitle, EmployeeGender } from "@/types/employee.type";

export type CreateEmployeePayload = {
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

export function createEmployee(payload: CreateEmployeePayload): Promise<{ id: number }> {
  return postJson<{ id: number }>("/employees", payload);
}
