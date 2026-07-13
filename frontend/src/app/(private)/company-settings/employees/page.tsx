"use client";

import Link from "next/link";
import { DownloadSimpleIcon, FunnelIcon, MagnifyingGlassIcon, PencilSimpleIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TableSortLabel from "@mui/material/TableSortLabel";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MuiLink from "@mui/material/Link";
import { toast } from "@/components/ui/toast";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmployeeStatusDialog } from "@/components/employee/status-dialog";
import { getEmployees, resendEmployeeInvite, updateEmployeeStatus } from "@/apis/employee";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { EmployeeListItem, EmployeeSortBy, EmployeeStatusFilterValue, SortDirection } from "@/types/employee.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";

const PAGE_SIZE = 20;
const EXPORT_PAGE_SIZE = 1000;
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS: { value: EmployeeStatusFilterValue; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "pending", label: "Pending Invitation" },
];

// Same shape as Associated Organizations' SORTABLE_COLUMNS/STATIC_COLUMN_LABELS
// split (see backend/CLAUDE.md and that page) — every column here happens to
// be sortable per 009's own spec, unlike that page's 2-of-7, so this list is
// just every data column.
const SORTABLE_COLUMNS: { key: EmployeeSortBy; label: string }[] = [
  { key: "firstName", label: "Employee Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "department", label: "Department" },
  { key: "grade", label: "Grade" },
  { key: "contactNumber", label: "Contact Number" },
  { key: "invitationStatus", label: "Invitation Status" },
  { key: "status", label: "Employee Status" },
];

function formatContactNumber(employee: EmployeeListItem): string {
  if (!employee.contactNumber) return "—";
  return `${employee.countryCode ?? ""} ${employee.contactNumber}`.trim();
}

function toCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function EmployeeAvatar({ name }: { name: string }) {
  return (
    <Avatar sx={{ width: 24, height: 24, fontSize: "0.75rem", fontWeight: 600, bgcolor: "action.selected", color: "text.secondary" }}>
      {name.charAt(0).toUpperCase()}
    </Avatar>
  );
}

export default function EmployeeListingPage() {
  const [isFilterRowOpen, setIsFilterRowOpen] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [contactNumberInput, setContactNumberInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatusFilterValue | "">("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const [sortBy, setSortBy] = useState<EmployeeSortBy>("firstName");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [isExporting, setIsExporting] = useState(false);

  const [suspendDialogEmployee, setSuspendDialogEmployee] = useState<EmployeeListItem | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setName(nameInput.trim());
      setEmail(emailInput.trim());
      setContactNumber(contactNumberInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [nameInput, emailInput, contactNumberInput]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(undefined);

    getEmployees({
      name,
      email,
      contactNumber,
      status: statusFilter ? [statusFilter] : [],
      sortBy,
      sortDir,
      page: 1,
      pageSize: PAGE_SIZE,
    })
      .then(({ employees: fetched, hasMore: fetchedHasMore }) => {
        if (!isMounted) return;
        setEmployees(fetched);
        setPage(1);
        setHasMore(fetchedHasMore);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [name, email, contactNumber, statusFilter, sortBy, sortDir]);

  async function handleLoadMore(): Promise<void> {
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { employees: fetched, hasMore: fetchedHasMore } = await getEmployees({
        name,
        email,
        contactNumber,
        status: statusFilter ? [statusFilter] : [],
        sortBy,
        sortDir,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setEmployees((previous) => [...previous, ...fetched]);
      setPage(nextPage);
      setHasMore(fetchedHasMore);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleSort(column: EmployeeSortBy): void {
    if (sortBy === column) {
      setSortDir((previous) => (previous === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  function handleCloseFilters(): void {
    setNameInput("");
    setEmailInput("");
    setContactNumberInput("");
    setStatusFilter("");
    setIsFilterRowOpen(false);
  }

  async function handleResend(employee: EmployeeListItem): Promise<void> {
    setResendingId(employee.id);
    try {
      await resendEmployeeInvite(employee.id);
      toast.success("Invitation resent.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setResendingId(null);
    }
  }

  async function handleActivate(employee: EmployeeListItem): Promise<void> {
    try {
      const { employee: updated } = await updateEmployeeStatus(employee.id, "active");
      setEmployees((previous) => previous.map((e) => (e.id === updated.id ? { ...e, status: updated.status } : e)));
      toast.success("Employee activated.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    }
  }

  function handleStatusChanged(employeeId: number, status: "active" | "suspended"): void {
    setEmployees((previous) => previous.map((e) => (e.id === employeeId ? { ...e, status } : e)));
  }

  async function handleExport(): Promise<void> {
    setIsExporting(true);
    try {
      const { employees: allMatching } = await getEmployees({
        name,
        email,
        contactNumber,
        status: statusFilter ? [statusFilter] : [],
        sortBy,
        sortDir,
        page: 1,
        pageSize: EXPORT_PAGE_SIZE,
      });

      const header = ["Employee Name", "Email", "Role", "Department", "Grade", "Contact Number", "Invitation Status", "Employee Status"];
      const rows = allMatching.map((employee) => [
        `${employee.firstName} ${employee.lastName}`.trim(),
        employee.email,
        employee.role ?? "",
        employee.department ?? "",
        employee.grade ?? "",
        formatContactNumber(employee),
        employee.invitationStatus === "pending" ? "Pending" : "Registered",
        employee.status === "active" ? "Active" : "Suspended",
      ]);
      const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "employees.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsExporting(false);
    }
  }

  const sentinelRef = useInfiniteScroll(handleLoadMore, hasMore, isLoadingMore);

  return (
    <Box sx={{ mx: "auto", display: "flex", minHeight: 0, width: "100%", maxWidth: 1152, flex: 1, flexDirection: "column", overflow: "hidden", px: 2, py: 5 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Employee Management
          </Typography>
          <IconButton
            onClick={() => (isFilterRowOpen ? handleCloseFilters() : setIsFilterRowOpen(true))}
            aria-label={isFilterRowOpen ? "Close filters" : "Show filters"}
            size="small"
            sx={{
              bgcolor: isFilterRowOpen ? "error.main" : "action.selected",
              color: isFilterRowOpen ? "error.contrastText" : "text.primary",
              "&:hover": { bgcolor: isFilterRowOpen ? "error.dark" : "action.selected" },
            }}
          >
            {isFilterRowOpen ? <XIcon size={16} /> : <FunnelIcon size={16} />}
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button variant="outline" disabled={isExporting} onClick={handleExport}>
            {isExporting ? <Spinner /> : <DownloadSimpleIcon size={16} />}
            Export
          </Button>
          <Button component={Link} href={ROUTES.EMPLOYEE_BULK_INVITE} variant="outline">
            Bulk Invite
          </Button>
          <Button component={Link} href={ROUTES.EMPLOYEE_INVITE}>Invite</Button>
        </Stack>
      </Stack>

      {loadError ? (
        <Stack sx={{ mt: 3, alignItems: "center", gap: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {loadError}
          </Typography>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </Stack>
      ) : isLoading ? (
        <Stack direction="row" sx={{ mt: 3, alignItems: "center", justifyContent: "center", gap: 1 }}>
          <Spinner />
          <Typography variant="body2" color="text.secondary">
            Loading…
          </Typography>
        </Stack>
      ) : (
        <Box sx={{ mt: 3, display: "flex", minHeight: 0, flex: 1, flexDirection: "column", overflow: "hidden", borderRadius: 2, border: 1, borderColor: "divider" }}>
          <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  {SORTABLE_COLUMNS.map((column) => (
                    <TableHead key={column.key}>
                      <TableSortLabel active={sortBy === column.key} direction={sortBy === column.key ? sortDir : "asc"} onClick={() => handleSort(column.key)}>
                        {column.label}
                      </TableSortLabel>
                    </TableHead>
                  ))}
                  <TableHead>Actions</TableHead>
                </TableRow>

                {isFilterRowOpen ? (
                  <TableRow>
                    <TableHead>
                      <Input
                        value={nameInput}
                        onChange={(event) => setNameInput(event.target.value)}
                        placeholder="Search"
                        size="small"
                        startAdornment={
                          <InputAdornment position="start">
                            <MagnifyingGlassIcon size={14} />
                          </InputAdornment>
                        }
                      />
                    </TableHead>
                    <TableHead>
                      <Input
                        value={emailInput}
                        onChange={(event) => setEmailInput(event.target.value)}
                        placeholder="Search"
                        size="small"
                        startAdornment={
                          <InputAdornment position="start">
                            <MagnifyingGlassIcon size={14} />
                          </InputAdornment>
                        }
                      />
                    </TableHead>
                    <TableHead />
                    <TableHead />
                    <TableHead />
                    <TableHead>
                      <Input
                        value={contactNumberInput}
                        onChange={(event) => setContactNumberInput(event.target.value)}
                        placeholder="Search"
                        size="small"
                        startAdornment={
                          <InputAdornment position="start">
                            <MagnifyingGlassIcon size={14} />
                          </InputAdornment>
                        }
                      />
                    </TableHead>
                    <TableHead />
                    <TableHead>
                      <SelectField
                        value={statusFilter}
                        onValueChange={(next) => setStatusFilter(next as EmployeeStatusFilterValue | "")}
                        options={[{ value: "", label: "All" }, ...STATUS_OPTIONS]}
                      />
                    </TableHead>
                    <TableHead />
                  </TableRow>
                ) : null}
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={SORTABLE_COLUMNS.length + 1} sx={{ py: 3, textAlign: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        No Employees Found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <EmployeeAvatar name={employee.firstName} />
                          <Typography variant="body2">{`${employee.firstName} ${employee.lastName}`.trim()}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.role ?? "—"}</TableCell>
                      <TableCell>{employee.department ?? "—"}</TableCell>
                      <TableCell>{employee.grade ?? "—"}</TableCell>
                      <TableCell>{formatContactNumber(employee)}</TableCell>
                      <TableCell>
                        <Chip
                          label={employee.invitationStatus === "pending" ? "Pending" : "Registered"}
                          color={employee.invitationStatus === "pending" ? "warning" : "success"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={employee.status === "active" ? "Active" : "Suspended"} color={employee.status === "active" ? "success" : "default"} size="small" />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                          {employee.invitationStatus === "pending" ? (
                            <Button type="button" variant="ghost" size="sm" disabled={resendingId === employee.id} onClick={() => handleResend(employee)}>
                              {resendingId === employee.id ? <Spinner /> : null}
                              Resend Invite
                            </Button>
                          ) : null}
                          <MuiLink
                            component={Link}
                            href={ROUTES.employeeEdit(employee.id)}
                            aria-label={`Edit ${employee.firstName} ${employee.lastName}`.trim()}
                            sx={{ display: "inline-flex", color: "text.secondary", "&:hover": { color: "text.primary" } }}
                          >
                            <PencilSimpleIcon size={16} />
                          </MuiLink>
                          {/* Suspend requires confirmation; Activate applies immediately —
                              an intentional asymmetry per 009's Flow, not the same
                              always-confirm pattern Grade/Department/Role use. */}
                          <Switch
                            checked={employee.status === "active"}
                            onCheckedChange={(checked) => (checked ? handleActivate(employee) : setSuspendDialogEmployee(employee))}
                            aria-label={employee.status === "active" ? "Suspend" : "Activate"}
                          />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {hasMore ? <Box ref={sentinelRef} aria-hidden sx={{ height: "1px" }} /> : null}
          </Box>
          {isLoadingMore ? (
            <Box sx={{ display: "flex", justifyContent: "center", borderTop: 1, borderColor: "divider", p: 1.5 }}>
              <Spinner />
            </Box>
          ) : null}
        </Box>
      )}

      <EmployeeStatusDialog
        employee={suspendDialogEmployee}
        onOpenChange={(open) => {
          if (!open) setSuspendDialogEmployee(null);
        }}
        onStatusChanged={handleStatusChanged}
      />
    </Box>
  );
}
