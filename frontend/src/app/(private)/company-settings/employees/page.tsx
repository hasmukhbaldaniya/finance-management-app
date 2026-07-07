"use client";

import Link from "next/link";
import { CaretDownIcon, CaretUpIcon, DownloadSimpleIcon, FunnelIcon, MagnifyingGlassIcon, PencilSimpleIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

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
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
      {name.charAt(0)}
    </span>
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

  function renderSortIcon(column: EmployeeSortBy) {
    if (sortBy !== column) return null;
    return sortDir === "asc" ? <CaretUpIcon className="inline size-3" /> : <CaretDownIcon className="inline size-3" />;
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
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Employee Management</h1>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => (isFilterRowOpen ? handleCloseFilters() : setIsFilterRowOpen(true))}
            aria-label={isFilterRowOpen ? "Close filters" : "Show filters"}
            className={cn(
              "rounded-full",
              isFilterRowOpen ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-muted"
            )}
          >
            {isFilterRowOpen ? <XIcon className="size-4" /> : <FunnelIcon className="size-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={isExporting} onClick={handleExport}>
            {isExporting ? <Spinner /> : <DownloadSimpleIcon data-icon="inline-start" />}
            Export
          </Button>
          <Link href={ROUTES.EMPLOYEE_BULK_INVITE} className={cn(buttonVariants({ variant: "outline" }))}>
            Bulk Invite
          </Link>
          <Link href={ROUTES.EMPLOYEE_INVITE} className={cn(buttonVariants())}>
            Invite
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="mt-6 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      ) : isLoading ? (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Loading…
        </div>
      ) : (
        <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {SORTABLE_COLUMNS.map((column) => (
                    <TableHead key={column.key}>
                      <button type="button" onClick={() => handleSort(column.key)} className="flex items-center gap-1 font-medium">
                        {column.label} {renderSortIcon(column.key)}
                      </button>
                    </TableHead>
                  ))}
                  <TableHead>Actions</TableHead>
                </TableRow>

                {isFilterRowOpen ? (
                  <TableRow>
                    <TableHead>
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={nameInput}
                          onChange={(event) => setNameInput(event.target.value)}
                          placeholder="Search"
                          className="h-8 pl-7 text-xs font-normal"
                        />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={emailInput}
                          onChange={(event) => setEmailInput(event.target.value)}
                          placeholder="Search"
                          className="h-8 pl-7 text-xs font-normal"
                        />
                      </div>
                    </TableHead>
                    <TableHead />
                    <TableHead />
                    <TableHead />
                    <TableHead>
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={contactNumberInput}
                          onChange={(event) => setContactNumberInput(event.target.value)}
                          placeholder="Search"
                          className="h-8 pl-7 text-xs font-normal"
                        />
                      </div>
                    </TableHead>
                    <TableHead />
                    <TableHead>
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as EmployeeStatusFilterValue | "")}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="">All</option>
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </TableHead>
                    <TableHead />
                  </TableRow>
                ) : null}
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={SORTABLE_COLUMNS.length + 1} className="py-6 text-center text-sm text-muted-foreground">
                      No Employees Found
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <EmployeeAvatar name={employee.firstName} />
                          {`${employee.firstName} ${employee.lastName}`.trim()}
                        </div>
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.role ?? "—"}</TableCell>
                      <TableCell>{employee.department ?? "—"}</TableCell>
                      <TableCell>{employee.grade ?? "—"}</TableCell>
                      <TableCell>{formatContactNumber(employee)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            employee.invitationStatus === "pending"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                              : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                          )}
                        >
                          {employee.invitationStatus === "pending" ? "Pending" : "Registered"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            employee.status === "active"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {employee.status === "active" ? "Active" : "Suspended"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {employee.invitationStatus === "pending" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={resendingId === employee.id}
                              onClick={() => handleResend(employee)}
                            >
                              {resendingId === employee.id ? <Spinner /> : null}
                              Resend Invite
                            </Button>
                          ) : null}
                          <Link
                            href={ROUTES.employeeEdit(employee.id)}
                            aria-label={`Edit ${employee.firstName} ${employee.lastName}`.trim()}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <PencilSimpleIcon className="size-4" />
                          </Link>
                          {/* Suspend requires confirmation; Activate applies immediately —
                              an intentional asymmetry per 009's Flow, not the same
                              always-confirm pattern Grade/Department/Role use. */}
                          <Switch
                            checked={employee.status === "active"}
                            onCheckedChange={(checked) =>
                              checked ? handleActivate(employee) : setSuspendDialogEmployee(employee)
                            }
                            aria-label={employee.status === "active" ? "Suspend" : "Activate"}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {hasMore ? <div ref={sentinelRef} aria-hidden className="h-px" /> : null}
          </div>
          {isLoadingMore ? (
            <div className="flex justify-center border-t border-border p-3">
              <Spinner />
            </div>
          ) : null}
        </div>
      )}

      <EmployeeStatusDialog
        employee={suspendDialogEmployee}
        onOpenChange={(open) => {
          if (!open) setSuspendDialogEmployee(null);
        }}
        onStatusChanged={handleStatusChanged}
      />
    </div>
  );
}
