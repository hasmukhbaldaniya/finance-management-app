import { apiCall } from "@/utils/apiManager/apiManager";

export type FfNumberRow = {
  airlineId: number;
  ffNumber: string;
};

export function addEmployeeFfNumbers(employeeId: number, ffNumbers: FfNumberRow[]): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/employees/${employeeId}/ff-numbers`, {
    method: "POST",
    body: JSON.stringify({ ffNumbers }),
  });
}
