import { apiCall } from "@/utils/apiManager/apiManager";
import type { EmployeePickerOption } from "@/types/employee.type";

export function getEmployeesForPicker(): Promise<{ employees: EmployeePickerOption[] }> {
  return apiCall<{ employees: EmployeePickerOption[] }>("/employees", { method: "GET" });
}
