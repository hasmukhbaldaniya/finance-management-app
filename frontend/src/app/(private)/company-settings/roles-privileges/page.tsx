"use client";

import { CaretDownIcon, CaretUpIcon, EyeIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleFormDialog } from "@/components/role/form-dialog";
import { RoleMembersDialog } from "@/components/role/members-dialog";
import { RoleStatusDialog } from "@/components/role/status-dialog";
import { RoleViewDialog } from "@/components/role/view-dialog";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { getRoles } from "@/apis/role";
import type { Role, RoleSortBy, SortDirection } from "@/types/role.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function RolesAndPrivilegesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<RoleSortBy>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const [roles, setRoles] = useState<Role[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  const [formDialog, setFormDialog] = useState<{ open: boolean; role: Role | null }>({
    open: false,
    role: null,
  });
  const [viewDialogRole, setViewDialogRole] = useState<Role | null>(null);
  const [membersDialogRole, setMembersDialogRole] = useState<Role | null>(null);
  const [statusDialogRole, setStatusDialogRole] = useState<Role | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(undefined);

    getRoles({ search, sortBy, sortDir, page: 1, pageSize: PAGE_SIZE })
      .then(({ roles: fetched, hasMore: fetchedHasMore }) => {
        if (!isMounted) return;
        setRoles(fetched);
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
      const { roles: fetched, hasMore: fetchedHasMore } = await getRoles({
        search,
        sortBy,
        sortDir,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setRoles((previous) => [...previous, ...fetched]);
      setPage(nextPage);
      setHasMore(fetchedHasMore);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleSort(column: RoleSortBy): void {
    if (sortBy === column) {
      setSortDir((previous) => (previous === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  function handleStatusChanged(updated: Role): void {
    setRoles((previous) => previous.map((r) => (r.id === updated.id ? updated : r)));
  }

  function handleSaved(saved: Role): void {
    setRoles((previous) => {
      const exists = previous.some((r) => r.id === saved.id);
      return exists ? previous.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...previous];
    });
  }

  function handleDeleted(roleId: number): void {
    setRoles((previous) => previous.filter((r) => r.id !== roleId));
  }

  function renderSortIcon(column: RoleSortBy) {
    if (sortBy !== column) return null;
    return sortDir === "asc" ? <CaretUpIcon className="inline size-3" /> : <CaretDownIcon className="inline size-3" />;
  }

  const sentinelRef = useInfiniteScroll(handleLoadMore, hasMore, isLoadingMore);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Roles & Privileges</h1>
        <Button onClick={() => setFormDialog({ open: true, role: null })}>New Role</Button>
      </div>

      <div className="mt-4">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search roles…"
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
      ) : roles.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No roles found.</p>
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
                      Role {renderSortIcon("name")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("roleType")}
                      className="flex items-center gap-1 font-medium"
                    >
                      Role Type {renderSortIcon("roleType")}
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
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>{role.name}</TableCell>
                    <TableCell>{role.isDefault ? "Default" : "Custom"}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => (role.membersCount > 0 ? setMembersDialogRole(role) : undefined)}
                        className={cn(
                          "underline-offset-4",
                          role.membersCount > 0 ? "text-primary hover:underline" : "cursor-default text-muted-foreground"
                        )}
                      >
                        {role.membersCount}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {role.isDefault ? (
                          <button
                            type="button"
                            aria-label={`View ${role.name}`}
                            onClick={() => setViewDialogRole(role)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <EyeIcon className="size-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Edit ${role.name}`}
                            onClick={() => setFormDialog({ open: true, role })}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <PencilSimpleIcon className="size-4" />
                          </button>
                        )}
                        <Switch
                          checked={role.isActive}
                          disabled={role.isDefault}
                          onCheckedChange={() => (role.isDefault ? undefined : setStatusDialogRole(role))}
                          aria-label={role.isActive ? `Disable ${role.name}` : `Enable ${role.name}`}
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

      <RoleFormDialog
        open={formDialog.open}
        onOpenChange={(open) => setFormDialog((previous) => ({ ...previous, open }))}
        role={formDialog.role}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      <RoleViewDialog
        role={viewDialogRole}
        onOpenChange={(open) => {
          if (!open) setViewDialogRole(null);
        }}
      />

      <RoleMembersDialog
        roleId={membersDialogRole?.id ?? null}
        roleName={membersDialogRole?.name ?? ""}
        onOpenChange={(open) => {
          if (!open) setMembersDialogRole(null);
        }}
      />

      <RoleStatusDialog
        role={statusDialogRole}
        onOpenChange={(open) => {
          if (!open) setStatusDialogRole(null);
        }}
        onStatusChanged={handleStatusChanged}
      />
    </div>
  );
}
