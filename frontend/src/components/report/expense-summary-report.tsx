"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@/components/date-picker";
import { SelectField } from "@/components/select-field";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getExpenseSummaryReport } from "@/apis/reports";
import { getDepartments } from "@/apis/department";
import type { ExpenseSummaryRow } from "@/types/report.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { formatInr, getDefaultReportDateRange } from "@/utils/helpers/format.helper";

export function ExpenseSummaryReport() {
  const [from, setFrom] = useState(() => getDefaultReportDateRange().from);
  const [to, setTo] = useState(() => getDefaultReportDateRange().to);
  const [department, setDepartment] = useState("");
  const [departmentOptions, setDepartmentOptions] = useState<{ value: string; label: string }[]>([]);

  const [rows, setRows] = useState<ExpenseSummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => {
    getDepartments({ pageSize: 100 })
      .then(({ departments }) => setDepartmentOptions(departments.map((department) => ({ value: department.name, label: department.name }))))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(undefined);

    getExpenseSummaryReport({ from: from || undefined, to: to || undefined, department: department || undefined })
      .then(({ rows: fetched }) => {
        if (isMounted) setRows(fetched);
      })
      .catch((error: unknown) => {
        if (isMounted) setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [from, to, department]);

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <Stack spacing={1}>
          <Label htmlFor="expense-summary-from">From</Label>
          <DatePicker id="expense-summary-from" value={from} onChange={setFrom} sx={{ height: 40, width: 200 }} />
        </Stack>
        <Stack spacing={1}>
          <Label htmlFor="expense-summary-to">To</Label>
          <DatePicker id="expense-summary-to" value={to} onChange={setTo} sx={{ height: 40, width: 200 }} />
        </Stack>
        <Stack spacing={1}>
          <Label htmlFor="expense-summary-department">Department</Label>
          <SelectField
            id="expense-summary-department"
            value={department}
            onValueChange={setDepartment}
            placeholder="All"
            options={[{ value: "", label: "All" }, ...departmentOptions]}
            sx={{ height: 40, width: 208 }}
          />
        </Stack>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <Spinner size={24} />
        </Box>
      ) : loadError ? (
        <Typography variant="body2" color="error" sx={{ py: 8, textAlign: "center" }}>
          {loadError}
        </Typography>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead align="right">Expense Count</TableHead>
              <TableHead align="right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.categoryId}>
                <TableCell>{row.categoryName}</TableCell>
                <TableCell align="right">{row.expenseCount}</TableCell>
                <TableCell align="right">{formatInr(row.totalAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
