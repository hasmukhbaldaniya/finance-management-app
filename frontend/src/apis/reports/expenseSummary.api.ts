import { apiCall } from "@/utils/apiManager/apiManager";
import type { ExpenseSummaryRow } from "@/types/report.type";
import type { EmployeeSummaryRow } from "@/utils/helpers/format.helper";

export type ExpenseSummaryParams = {
  from?: string;
  to?: string;
  department?: string;
};

export function getExpenseSummaryReport(
  params: ExpenseSummaryParams = {}
): Promise<{ rows: ExpenseSummaryRow[]; byEmployeeRows: EmployeeSummaryRow[]; truncated: boolean }> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.department) query.set("department", params.department);

  const queryString = query.toString();
  return apiCall<{ rows: ExpenseSummaryRow[]; byEmployeeRows: EmployeeSummaryRow[]; truncated: boolean }>(
    `/reports/expense-summary${queryString ? `?${queryString}` : ""}`,
    { method: "GET" }
  );
}
