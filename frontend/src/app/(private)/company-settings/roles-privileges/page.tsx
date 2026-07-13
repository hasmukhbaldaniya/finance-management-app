"use client";

import { EyeIcon, PencilSimpleIcon } from "@phosphor-icons/react";
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
import { RoleFormDialog } from "@/components/role/form-dialog";
import { RoleMembersDialog } from "@/components/role/members-dialog";
import { RoleStatusDialog } from "@/components/role/status-dialog";
import { RoleViewDialog } from "@/components/role/view-dialog";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { getRoles } from "@/apis/role";
import type { Role, RoleSortBy, SortDirection } from "@/types/role.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

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

  const sentinelRef = useInfiniteScroll(handleLoadMore, hasMore, isLoadingMore);

  return (
    <Box sx={{ mx: "auto", display: "flex", minHeight: 0, width: "100%", maxWidth: 896, flex: 1, flexDirection: "column", overflow: "hidden", px: 2, py: 5 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Roles &amp; Privileges
        </Typography>
        <Button onClick={() => setFormDialog({ open: true, role: null })}>New Role</Button>
      </Stack>

      <Box sx={{ mt: 2 }}>
        <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search roles…" sx={{ maxWidth: 320 }} />
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
      ) : roles.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          No roles found.
        </Typography>
      ) : (
        <Box sx={{ mt: 3, display: "flex", minHeight: 0, flex: 1, flexDirection: "column", overflow: "hidden", borderRadius: 2, border: 1, borderColor: "divider" }}>
          <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <TableSortLabel active={sortBy === "name"} direction={sortBy === "name" ? sortDir : "asc"} onClick={() => handleSort("name")}>
                      Role
                    </TableSortLabel>
                  </TableHead>
                  <TableHead>
                    <TableSortLabel active={sortBy === "roleType"} direction={sortBy === "roleType" ? sortDir : "asc"} onClick={() => handleSort("roleType")}>
                      Role Type
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
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>{role.name}</TableCell>
                    <TableCell>{role.isDefault ? "Default" : "Custom"}</TableCell>
                    <TableCell>
                      <Box
                        component="button"
                        type="button"
                        onClick={() => (role.membersCount > 0 ? setMembersDialogRole(role) : undefined)}
                        sx={{
                          textDecorationLine: "underline",
                          textUnderlineOffset: "4px",
                          color: role.membersCount > 0 ? "primary.main" : "text.secondary",
                          cursor: role.membersCount > 0 ? "pointer" : "default",
                          background: "none",
                          border: "none",
                          p: 0,
                          font: "inherit",
                        }}
                      >
                        {role.membersCount}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        {role.isDefault ? (
                          <Box
                            component="button"
                            type="button"
                            aria-label={`View ${role.name}`}
                            onClick={() => setViewDialogRole(role)}
                            sx={{ display: "inline-flex", color: "text.secondary", background: "none", border: "none", p: 0, cursor: "pointer", "&:hover": { color: "text.primary" } }}
                          >
                            <EyeIcon size={16} />
                          </Box>
                        ) : (
                          <Box
                            component="button"
                            type="button"
                            aria-label={`Edit ${role.name}`}
                            onClick={() => setFormDialog({ open: true, role })}
                            sx={{ display: "inline-flex", color: "text.secondary", background: "none", border: "none", p: 0, cursor: "pointer", "&:hover": { color: "text.primary" } }}
                          >
                            <PencilSimpleIcon size={16} />
                          </Box>
                        )}
                        <Switch
                          checked={role.isActive}
                          disabled={role.isDefault}
                          onCheckedChange={() => (role.isDefault ? undefined : setStatusDialogRole(role))}
                          aria-label={role.isActive ? `Disable ${role.name}` : `Enable ${role.name}`}
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
    </Box>
  );
}
