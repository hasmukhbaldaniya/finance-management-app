import { apiCall } from "@/utils/apiManager/apiManager";
import type { ExpenseSummaryRow } from "@/types/report.type";

export type ExpenseSummaryParams = {
  from?: string;
  to?: string;
  department?: string;
};

export function getExpenseSummaryReport(params: ExpenseSummaryParams = {}): Promise<{ rows: ExpenseSummaryRow[] }> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.department) query.set("department", params.department);

  const queryString = query.toString();
  return apiCall<{ rows: ExpenseSummaryRow[] }>(`/reports/expense-summary${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
  });
}
