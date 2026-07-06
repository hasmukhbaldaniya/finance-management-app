"use client";

import { CaretDownIcon, CaretUpIcon, FunnelIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { getAssociatedOrganizations, updateAssociatedOrganizationStatus } from "@/apis/associated-organization";
import type {
  AssociatedOrganization,
  AssociatedOrganizationSortBy,
  RegistrationsLabel,
  SortDirection,
} from "@/types/associated-organization.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const REGISTRATIONS_OPTIONS: RegistrationsLabel[] = ["Registered", "Self-Registered", "Invited"];
const STATUS_OPTIONS: Array<"Active" | "Disabled"> = ["Active", "Disabled"];

// Only Organization Name and Employee Name are sortable columns in this design —
// the remaining columns render as plain (non-interactive) headers, matching the
// approved reference screenshots exactly rather than the "all columns sortable"
// draft in 007's original story doc.
const SORTABLE_COLUMNS: Array<{ key: AssociatedOrganizationSortBy; label: string }> = [
  { key: "organizationName", label: "Organization Name" },
  { key: "contactName", label: "Employee Name" },
];
const STATIC_COLUMN_LABELS: Record<string, string> = {
  contactEmail: "Email Address",
  contactPhone: "Contact No.",
  registrations: "Registration",
  invitedAt: "Invited On",
  isActive: "Status",
};

function formatInvitedAt(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("en-GB") : "—";
}

function ContactAvatar({ name }: { name: string }) {
  return (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
      {name.charAt(0)}
    </span>
  );
}

function StatusPill({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        isActive
          ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400"
          : "bg-muted text-muted-foreground hover:bg-muted/70"
      )}
    >
      {isActive ? "Active" : "Disabled"}
    </button>
  );
}

export default function AssociatedOrganizationsNetworkPage() {
  const [isFilterRowOpen, setIsFilterRowOpen] = useState(false);

  const [organizationNameInput, setOrganizationNameInput] = useState("");
  const [contactNameInput, setContactNameInput] = useState("");
  const [contactEmailInput, setContactEmailInput] = useState("");
  const [contactPhoneInput, setContactPhoneInput] = useState("");
  const [registrationsFilter, setRegistrationsFilter] = useState<RegistrationsLabel | "">("");
  const [statusFilter, setStatusFilter] = useState<"Active" | "Disabled" | "">("");

  const [organizationName, setOrganizationName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [sortBy, setSortBy] = useState<AssociatedOrganizationSortBy>("organizationName");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const [rows, setRows] = useState<AssociatedOrganization[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setOrganizationName(organizationNameInput.trim());
      setContactName(contactNameInput.trim());
      setContactEmail(contactEmailInput.trim());
      setContactPhone(contactPhoneInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [organizationNameInput, contactNameInput, contactEmailInput, contactPhoneInput]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(undefined);

    getAssociatedOrganizations({
      registrations: registrationsFilter ? [registrationsFilter] : [],
      status: statusFilter ? [statusFilter] : [],
      organizationName,
      contactName,
      contactEmail,
      contactPhone,
      sortBy,
      sortDir,
      page: 1,
      pageSize: PAGE_SIZE,
    })
      .then(({ associatedOrganizations, hasMore: fetchedHasMore }) => {
        if (!isMounted) return;
        setRows(associatedOrganizations);
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
  }, [registrationsFilter, statusFilter, organizationName, contactName, contactEmail, contactPhone, sortBy, sortDir]);

  async function handleLoadMore(): Promise<void> {
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { associatedOrganizations, hasMore: fetchedHasMore } = await getAssociatedOrganizations({
        registrations: registrationsFilter ? [registrationsFilter] : [],
        status: statusFilter ? [statusFilter] : [],
        organizationName,
        contactName,
        contactEmail,
        contactPhone,
        sortBy,
        sortDir,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setRows((previous) => [...previous, ...associatedOrganizations]);
      setPage(nextPage);
      setHasMore(fetchedHasMore);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleSort(column: AssociatedOrganizationSortBy): void {
    if (sortBy === column) {
      setSortDir((previous) => (previous === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  async function handleToggleStatus(row: AssociatedOrganization): Promise<void> {
    const nextIsActive = !row.isActive;
    setRows((previous) => previous.map((r) => (r.id === row.id ? { ...r, isActive: nextIsActive } : r)));

    try {
      await updateAssociatedOrganizationStatus(row.id, nextIsActive);
    } catch (error) {
      setRows((previous) => previous.map((r) => (r.id === row.id ? { ...r, isActive: row.isActive } : r)));
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    }
  }

  function handleCloseFilters(): void {
    setOrganizationNameInput("");
    setContactNameInput("");
    setContactEmailInput("");
    setContactPhoneInput("");
    setRegistrationsFilter("");
    setStatusFilter("");
    setIsFilterRowOpen(false);
  }

  function renderSortIcon(column: AssociatedOrganizationSortBy) {
    if (sortBy !== column) return null;
    return sortDir === "asc" ? <CaretUpIcon className="inline size-3" /> : <CaretDownIcon className="inline size-3" />;
  }

  const sentinelRef = useInfiniteScroll(handleLoadMore, hasMore, isLoadingMore);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Associated Organizations</h1>
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
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No associated organizations found.</p>
      ) : (
        <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {SORTABLE_COLUMNS.map((column) => (
                    <TableHead key={column.key}>
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className="flex items-center gap-1 font-medium"
                      >
                        {column.label} {renderSortIcon(column.key)}
                      </button>
                    </TableHead>
                  ))}
                  <TableHead>{STATIC_COLUMN_LABELS.contactEmail}</TableHead>
                  <TableHead>{STATIC_COLUMN_LABELS.contactPhone}</TableHead>
                  <TableHead>{STATIC_COLUMN_LABELS.registrations}</TableHead>
                  <TableHead>{STATIC_COLUMN_LABELS.invitedAt}</TableHead>
                  <TableHead>{STATIC_COLUMN_LABELS.isActive}</TableHead>
                </TableRow>

                {isFilterRowOpen ? (
                  <TableRow>
                    <TableHead>
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={organizationNameInput}
                          onChange={(event) => setOrganizationNameInput(event.target.value)}
                          placeholder="Search"
                          className="h-8 pl-7 text-xs font-normal"
                        />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={contactNameInput}
                          onChange={(event) => setContactNameInput(event.target.value)}
                          placeholder="Search"
                          className="h-8 pl-7 text-xs font-normal"
                        />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={contactEmailInput}
                          onChange={(event) => setContactEmailInput(event.target.value)}
                          placeholder="Search"
                          className="h-8 pl-7 text-xs font-normal"
                        />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={contactPhoneInput}
                          onChange={(event) => setContactPhoneInput(event.target.value)}
                          placeholder="Search"
                          className="h-8 pl-7 text-xs font-normal"
                        />
                      </div>
                    </TableHead>
                    <TableHead>
                      <select
                        value={registrationsFilter}
                        onChange={(event) => setRegistrationsFilter(event.target.value as RegistrationsLabel | "")}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="">All</option>
                        {REGISTRATIONS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </TableHead>
                    <TableHead />
                    <TableHead>
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as "Active" | "Disabled" | "")}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="">All</option>
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </TableHead>
                  </TableRow>
                ) : null}
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.organizationName ?? "Pending"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ContactAvatar name={row.contactName} />
                        {row.contactName}
                      </div>
                    </TableCell>
                    <TableCell>{row.contactEmail}</TableCell>
                    <TableCell>{row.contactPhone}</TableCell>
                    <TableCell>{row.registrations}</TableCell>
                    <TableCell>{formatInvitedAt(row.invitedAt)}</TableCell>
                    <TableCell>
                      <StatusPill isActive={row.isActive} onClick={() => handleToggleStatus(row)} />
                    </TableCell>
                  </TableRow>
                ))}
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
    </div>
  );
}
