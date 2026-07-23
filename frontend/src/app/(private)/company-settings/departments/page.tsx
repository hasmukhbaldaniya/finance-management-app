"use client";

import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TableSortLabel from "@mui/material/TableSortLabel";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DepartmentFormDialog } from "@/components/department/form-dialog";
import { DepartmentMembersDialog } from "@/components/department/members-dialog";
import { DepartmentStatusDialog } from "@/components/department/status-dialog";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { getDepartments } from "@/apis/department";
import type { Department, DepartmentSortBy, SortDirection } from "@/types/department.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function DepartmentManagementPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<DepartmentSortBy>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  const [formDialog, setFormDialog] = useState<{ open: boolean; department: Department | null }>({
    open: false,
    department: null,
  });
  const [membersDialogDepartment, setMembersDialogDepartment] = useState<Department | null>(null);
  const [statusDialogDepartment, setStatusDialogDepartment] = useState<Department | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(undefined);

    getDepartments({ search, sortBy, sortDir, page: 1, pageSize: PAGE_SIZE })
      .then(({ departments: fetched, hasMore: fetchedHasMore }) => {
        if (!isMounted) return;
        setDepartments(fetched);
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
  }, [search, sortBy, sortDir]);

  async function handleLoadMore(): Promise<void> {
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { departments: fetched, hasMore: fetchedHasMore } = await getDepartments({
        search,
        sortBy,
        sortDir,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setDepartments((previous) => [...previous, ...fetched]);
      setPage(nextPage);
      setHasMore(fetchedHasMore);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleSort(column: DepartmentSortBy): void {
    if (sortBy === column) {
      setSortDir((previous) => (previous === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  function handleStatusChanged(updated: Department): void {
    setDepartments((previous) => previous.map((d) => (d.id === updated.id ? updated : d)));
  }

  function handleSaved(saved: Department): void {
    setDepartments((previous) => {
      const exists = previous.some((d) => d.id === saved.id);
      return exists ? previous.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...previous];
    });
  }

  function handleDeleted(departmentId: number): void {
    setDepartments((previous) => previous.filter((d) => d.id !== departmentId));
  }

  const sentinelRef = useInfiniteScroll(handleLoadMore, hasMore, isLoadingMore);

  return (
    <Box sx={{ mx: "auto", display: "flex", minHeight: 0, width: "100%", maxWidth: 896, flex: 1, flexDirection: "column", overflow: "hidden", px: 2, py: 5 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Department Management
        </Typography>
        <Button onClick={() => setFormDialog({ open: true, department: null })}>New Department</Button>
      </Stack>

      <Box sx={{ mt: 2 }}>
        <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search departments…" sx={{ maxWidth: 320 }} />
      </Box>

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
      ) : departments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          No departments found.
        </Typography>
      ) : (
        <Box sx={{ mt: 3, display: "flex", minHeight: 0, flex: 1, flexDirection: "column", overflow: "hidden", borderRadius: 2, border: 1, borderColor: "divider" }}>
          <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <TableSortLabel active={sortBy === "name"} direction={sortBy === "name" ? sortDir : "asc"} onClick={() => handleSort("name")}>
                      Departments
                    </TableSortLabel>
                  </TableHead>
                  <TableHead>
                    <TableSortLabel active={sortBy === "membersCount"} direction={sortBy === "membersCount" ? sortDir : "asc"} onClick={() => handleSort("membersCount")}>
                      Members
                    </TableSortLabel>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell>{department.name}</TableCell>
                    <TableCell>
                      <Box
                        component="button"
                        type="button"
                        onClick={() => (department.membersCount > 0 ? setMembersDialogDepartment(department) : undefined)}
                        sx={{
                          textDecorationLine: "underline",
                          textUnderlineOffset: "4px",
                          color: department.membersCount > 0 ? "primary.main" : "text.secondary",
                          cursor: department.membersCount > 0 ? "pointer" : "default",
                          background: "none",
                          border: "none",
                          p: 0,
                          font: "inherit",
                        }}
                      >
                        {department.membersCount}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Box
                          component="button"
                          type="button"
                          aria-label={`Edit ${department.name}`}
                          onClick={() => setFormDialog({ open: true, department })}
                          sx={{ display: "inline-flex", color: "text.secondary", background: "none", border: "none", p: 0, cursor: "pointer", "&:hover": { color: "text.primary" } }}
                        >
                          <PencilSimpleIcon size={16} />
                        </Box>
                        <Switch
                          checked={department.isActive}
                          onCheckedChange={() => setStatusDialogDepartment(department)}
                          aria-label={department.isActive ? `Disable ${department.name}` : `Enable ${department.name}`}
                        />
                      </Stack>
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

      <DepartmentFormDialog
        open={formDialog.open}
        onOpenChange={(open) => setFormDialog((previous) => ({ ...previous, open }))}
        department={formDialog.department}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      <DepartmentMembersDialog
        departmentId={membersDialogDepartment?.id ?? null}
        departmentName={membersDialogDepartment?.name ?? ""}
        onOpenChange={(open) => {
          if (!open) setMembersDialogDepartment(null);
        }}
      />

      <DepartmentStatusDialog
        department={statusDialogDepartment}
        onOpenChange={(open) => {
          if (!open) setStatusDialogDepartment(null);
        }}
        onStatusChanged={handleStatusChanged}
      />
    </Box>
  );
}
