import { apiCall } from "@/utils/apiManager/apiManager";
import type { RedFlaggedExpenseRow } from "@/types/report.type";

export type RedFlaggedExpensesParams = {
  from?: string;
  to?: string;
};

export function getRedFlaggedExpensesReport(
  params: RedFlaggedExpensesParams = {}
): Promise<{ rows: RedFlaggedExpenseRow[] }> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  const queryString = query.toString();
  return apiCall<{ rows: RedFlaggedExpenseRow[] }>(
    `/reports/red-flagged-expenses${queryString ? `?${queryString}` : ""}`,
    { method: "GET" }
  );
}
