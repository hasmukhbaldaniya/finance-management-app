"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TableSortLabel from "@mui/material/TableSortLabel";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import { FunnelIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { SelectField } from "@/components/select-field";
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
    <Avatar sx={{ width: 24, height: 24, fontSize: "0.75rem", fontWeight: 600, bgcolor: "action.selected", color: "text.secondary" }}>
      {name.charAt(0).toUpperCase()}
    </Avatar>
  );
}

function StatusPill({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
  return <Chip label={isActive ? "Active" : "Disabled"} color={isActive ? "success" : "default"} size="small" onClick={onClick} sx={{ cursor: "pointer" }} />;
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

  const sentinelRef = useInfiniteScroll(handleLoadMore, hasMore, isLoadingMore);

  return (
    <Box sx={{ mx: "auto", display: "flex", minHeight: 0, width: "100%", maxWidth: 1152, flex: 1, flexDirection: "column", overflow: "hidden", px: 2, py: 5 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Associated Organizations
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
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          No associated organizations found.
        </Typography>
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
                  <TableHead>{STATIC_COLUMN_LABELS.contactEmail}</TableHead>
                  <TableHead>{STATIC_COLUMN_LABELS.contactPhone}</TableHead>
                  <TableHead>{STATIC_COLUMN_LABELS.registrations}</TableHead>
                  <TableHead>{STATIC_COLUMN_LABELS.invitedAt}</TableHead>
                  <TableHead>{STATIC_COLUMN_LABELS.isActive}</TableHead>
                </TableRow>

                {isFilterRowOpen ? (
                  <TableRow>
                    <TableHead>
                      <Input
                        value={organizationNameInput}
                        onChange={(event) => setOrganizationNameInput(event.target.value)}
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
                        value={contactNameInput}
                        onChange={(event) => setContactNameInput(event.target.value)}
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
                        value={contactEmailInput}
                        onChange={(event) => setContactEmailInput(event.target.value)}
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
                        value={contactPhoneInput}
                        onChange={(event) => setContactPhoneInput(event.target.value)}
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
                      <SelectField
                        value={registrationsFilter}
                        onValueChange={(next) => setRegistrationsFilter(next as RegistrationsLabel | "")}
                        options={[{ value: "", label: "All" }, ...REGISTRATIONS_OPTIONS.map((option) => ({ value: option, label: option }))]}
                      />
                    </TableHead>
                    <TableHead />
                    <TableHead>
                      <SelectField
                        value={statusFilter}
                        onValueChange={(next) => setStatusFilter(next as "Active" | "Disabled" | "")}
                        options={[{ value: "", label: "All" }, ...STATUS_OPTIONS.map((option) => ({ value: option, label: option }))]}
                      />
                    </TableHead>
                  </TableRow>
                ) : null}
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.organizationName ?? "Pending"}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <ContactAvatar name={row.contactName} />
                        <Typography variant="body2">{row.contactName}</Typography>
                      </Stack>
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

            {hasMore ? <Box ref={sentinelRef} aria-hidden sx={{ height: "1px" }} /> : null}
          </Box>
          {isLoadingMore ? (
            <Box sx={{ display: "flex", justifyContent: "center", borderTop: 1, borderColor: "divider", p: 1.5 }}>
              <Spinner />
            </Box>
          ) : null}
        </Box>
      )}
    </Box>
  );
}
