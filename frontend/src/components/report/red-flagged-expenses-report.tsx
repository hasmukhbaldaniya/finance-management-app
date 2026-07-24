"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@/components/date-picker";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRedFlaggedExpensesReport } from "@/apis/reports";
import type { RedFlaggedExpenseRow } from "@/types/report.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { formatInr } from "@/utils/helpers/format.helper";
import { format } from "date-fns";

export function RedFlaggedExpensesReport() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [rows, setRows] = useState<RedFlaggedExpenseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(undefined);

    getRedFlaggedExpensesReport({ from: from || undefined, to: to || undefined })
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
  }, [from, to]);

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <Stack spacing={1}>
          <Label htmlFor="red-flagged-from">From</Label>
          <DatePicker id="red-flagged-from" value={from} onChange={setFrom} sx={{ height: 32, width: 176 }} />
        </Stack>
        <Stack spacing={1}>
          <Label htmlFor="red-flagged-to">To</Label>
          <DatePicker id="red-flagged-to" value={to} onChange={setTo} sx={{ height: 32, width: 176 }} />
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
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 8, textAlign: "center" }}>
          No red-flagged expenses in this range.
        </Typography>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Claim</TableHead>
              <TableHead align="right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Red Flag Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.expenseId}>
                <TableCell>{row.employeeName ?? "—"}</TableCell>
                <TableCell>{row.claimName ?? `#${row.claimId}`}</TableCell>
                <TableCell align="right">{formatInr(row.amount)}</TableCell>
                <TableCell>{row.expenseDate ? format(new Date(row.expenseDate), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>{row.redFlagReason ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
