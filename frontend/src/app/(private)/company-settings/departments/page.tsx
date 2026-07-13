"use client";

import { CaretDownIcon, CaretUpIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";

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

  function renderSortIcon(column: DepartmentSortBy) {
    if (sortBy !== column) return null;
    return sortDir === "asc" ? <CaretUpIcon className="inline size-3" /> : <CaretDownIcon className="inline size-3" />;
  }

  const sentinelRef = useInfiniteScroll(handleLoadMore, hasMore, isLoadingMore);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Department Management</h1>
        <Button onClick={() => setFormDialog({ open: true, department: null })}>New Department</Button>
      </div>

      <div className="mt-4">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search departments…"
          className="max-w-xs"
        />
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
      ) : departments.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No departments found.</p>
      ) : (
        <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Departments {renderSortIcon("name")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("membersCount")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Members {renderSortIcon("membersCount")}
                    </button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell>{department.name}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => (department.membersCount > 0 ? setMembersDialogDepartment(department) : undefined)}
                        className={cn(
                          "underline-offset-4",
                          department.membersCount > 0
                            ? "text-primary hover:underline"
                            : "cursor-default text-muted-foreground"
                        )}
                      >
                        {department.membersCount}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label={`Edit ${department.name}`}
                          onClick={() => setFormDialog({ open: true, department })}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <PencilSimpleIcon className="size-4" />
                        </button>
                        <Switch
                          checked={department.isActive}
                          onCheckedChange={() => setStatusDialogDepartment(department)}
                          aria-label={department.isActive ? `Disable ${department.name}` : `Enable ${department.name}`}
                        />
                      </div>
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
    </div>
  );
}
