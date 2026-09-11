"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@/components/date-picker";
import { SelectField } from "@/components/select-field";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTripCostReport } from "@/apis/reports";
import type { TripCostRow } from "@/types/report.type";
import type { TripStatus } from "@/types/trip.type";
import { TRIP_STATUS_OPTIONS } from "@/utils/constants/trip.constant";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { formatInr, getDefaultReportDateRange, groupByEmployee } from "@/utils/helpers/format.helper";
import { format } from "date-fns";

type ReportView = "detail" | "byEmployee";

export function TripCostReport() {
  const [from, setFrom] = useState(() => getDefaultReportDateRange().from);
  const [to, setTo] = useState(() => getDefaultReportDateRange().to);
  const [status, setStatus] = useState<TripStatus | "">("");
  const [view, setView] = useState<ReportView>("detail");

  const [rows, setRows] = useState<TripCostRow[]>([]);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();

  const byEmployeeRows = useMemo(
    () => groupByEmployee(rows, (row) => row.employeeName, (row) => row.totalAmount),
    [rows]
  );

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(undefined);

    getTripCostReport({ from: from || undefined, to: to || undefined, status: status || undefined })
      .then(({ rows: fetched, truncated }) => {
        if (isMounted) {
          setRows(fetched);
          setIsTruncated(truncated);
        }
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
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "flex-end" }}>
          <Stack spacing={1}>
            <Label htmlFor="trip-cost-from">From (Trip Start)</Label>
            <DatePicker id="trip-cost-from" value={from} onChange={setFrom} sx={{ height: 40, width: 200 }} />
          </Stack>
          <Stack spacing={1}>
            <Label htmlFor="trip-cost-to">To (Trip Start)</Label>
            <DatePicker id="trip-cost-to" value={to} onChange={setTo} sx={{ height: 40, width: 200 }} />
          </Stack>
          <Stack spacing={1}>
            <Label htmlFor="trip-cost-status">Status</Label>
            <SelectField
              id="trip-cost-status"
              value={status}
              onValueChange={(value) => setStatus(value as TripStatus | "")}
              placeholder="All"
              options={[{ value: "", label: "All" }, ...TRIP_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))]}
              sx={{ height: 40, width: 208 }}
            />
          </Stack>
        </Stack>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_event, value: ReportView | null) => value && setView(value)}
          size="small"
          aria-label="Report view"
        >
          <ToggleButton value="detail" aria-label="Detail view">
            Detail
          </ToggleButton>
          <ToggleButton value="byEmployee" aria-label="By employee view">
            By Employee
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {isTruncated && !isLoading && !loadError ? (
        <Alert severity="warning">
          This report only covers the first 2,000 matching rows per source. Narrow the date range to see a complete result.
        </Alert>
      ) : null}

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
          No trips match these filters.
        </Typography>
      ) : view === "byEmployee" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead align="right">Trip Count</TableHead>
              <TableHead align="right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byEmployeeRows.map((row) => (
              <TableRow key={row.employeeName}>
                <TableCell>{row.employeeName}</TableCell>
                <TableCell align="right">{row.count}</TableCell>
                <TableCell align="right">{formatInr(row.totalAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trip</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead align="right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.tripId}>
                <TableCell>{row.tripName}</TableCell>
                <TableCell>{row.employeeName ?? "—"}</TableCell>
                <TableCell>
                  {format(new Date(row.startAt), "dd MMM yyyy")} – {format(new Date(row.endAt), "dd MMM yyyy")}
                </TableCell>
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
