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
import { getClaimCostReport } from "@/apis/reports";
import type { ClaimCostRow } from "@/types/report.type";
import type { ClaimStatus } from "@/types/claim.type";
import { CLAIM_STATUS_OPTIONS } from "@/utils/constants/claim.constant";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { formatInr, getDefaultReportDateRange } from "@/utils/helpers/format.helper";
import { format } from "date-fns";

export function ClaimCostReport() {
  const [from, setFrom] = useState(() => getDefaultReportDateRange().from);
  const [to, setTo] = useState(() => getDefaultReportDateRange().to);
  const [status, setStatus] = useState<ClaimStatus | "">("");

  const [rows, setRows] = useState<ClaimCostRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(undefined);

    getClaimCostReport({ from: from || undefined, to: to || undefined, status: status || undefined })
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
  }, [from, to, status]);

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "flex-end" }}>
        <Stack spacing={1}>
          <Label htmlFor="claim-cost-from">From (Created)</Label>
          <DatePicker id="claim-cost-from" value={from} onChange={setFrom} sx={{ height: 40, width: 200 }} />
        </Stack>
        <Stack spacing={1}>
          <Label htmlFor="claim-cost-to">To (Created)</Label>
          <DatePicker id="claim-cost-to" value={to} onChange={setTo} sx={{ height: 40, width: 200 }} />
        </Stack>
        <Stack spacing={1}>
          <Label htmlFor="claim-cost-status">Status</Label>
          <SelectField
            id="claim-cost-status"
            value={status}
            onValueChange={(value) => setStatus(value as ClaimStatus | "")}
            placeholder="All"
            options={[{ value: "", label: "All" }, ...CLAIM_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))]}
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
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 8, textAlign: "center" }}>
          No claims match these filters.
        </Typography>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead align="right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.claimId}>
                <TableCell>{row.claimName ?? `#${row.claimId}`}</TableCell>
                <TableCell>{row.employeeName ?? "—"}</TableCell>
                <TableCell>{format(new Date(row.createdAt), "dd MMM yyyy")}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell align="right">{formatInr(row.totalAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
