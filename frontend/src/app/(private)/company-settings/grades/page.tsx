"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TableSortLabel from "@mui/material/TableSortLabel";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GradeFormDialog } from "@/components/grade/form-dialog";
import { GradeMembersDialog } from "@/components/grade/members-dialog";
import { GradeStatusDialog } from "@/components/grade/status-dialog";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { getGrades } from "@/apis/grade";
import type { Grade, GradeSortBy, SortDirection } from "@/types/grade.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function GradeManagementPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<GradeSortBy>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const [grades, setGrades] = useState<Grade[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  const [formDialog, setFormDialog] = useState<{ open: boolean; grade: Grade | null }>({
    open: false,
    grade: null,
  });
  const [membersDialogGrade, setMembersDialogGrade] = useState<Grade | null>(null);
  const [statusDialogGrade, setStatusDialogGrade] = useState<Grade | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(undefined);

    getGrades({ search, sortBy, sortDir, page: 1, pageSize: PAGE_SIZE })
      .then(({ grades: fetched, hasMore: fetchedHasMore }) => {
        if (!isMounted) return;
        setGrades(fetched);
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
      const { grades: fetched, hasMore: fetchedHasMore } = await getGrades({
        search,
        sortBy,
        sortDir,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setGrades((previous) => [...previous, ...fetched]);
      setPage(nextPage);
      setHasMore(fetchedHasMore);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleSort(column: GradeSortBy): void {
    if (sortBy === column) {
      setSortDir((previous) => (previous === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  function handleStatusChanged(updated: Grade): void {
    setGrades((previous) => previous.map((g) => (g.id === updated.id ? updated : g)));
  }

  function handleSaved(saved: Grade): void {
    setGrades((previous) => {
      const exists = previous.some((g) => g.id === saved.id);
      return exists ? previous.map((g) => (g.id === saved.id ? saved : g)) : [saved, ...previous];
    });
  }

  function handleDeleted(gradeId: number): void {
    setGrades((previous) => previous.filter((g) => g.id !== gradeId));
  }

  const sentinelRef = useInfiniteScroll(handleLoadMore, hasMore, isLoadingMore);

  return (
    <Box sx={{ mx: "auto", display: "flex", minHeight: 0, width: "100%", maxWidth: 896, flex: 1, flexDirection: "column", overflow: "hidden", px: 2, py: 5 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Grade Management
        </Typography>
        <Button onClick={() => setFormDialog({ open: true, grade: null })}>New Grade</Button>
      </Stack>

      <Box sx={{ mt: 2 }}>
        <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search grades…" sx={{ maxWidth: 320 }} />
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
      ) : grades.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          No grades found.
        </Typography>
      ) : (
        <Box sx={{ mt: 3, display: "flex", minHeight: 0, flex: 1, flexDirection: "column", overflow: "hidden", borderRadius: 2, border: 1, borderColor: "divider" }}>
          <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <TableSortLabel active={sortBy === "name"} direction={sortBy === "name" ? sortDir : "asc"} onClick={() => handleSort("name")}>
                      Grade
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
                {grades.map((grade) => (
                  <TableRow key={grade.id}>
                    <TableCell>{grade.name}</TableCell>
                    <TableCell>
                      <Box
                        component="button"
                        type="button"
                        onClick={() => (grade.membersCount > 0 ? setMembersDialogGrade(grade) : undefined)}
                        sx={{
                          textDecorationLine: "underline",
                          textUnderlineOffset: "4px",
                          color: grade.membersCount > 0 ? "primary.main" : "text.secondary",
                          cursor: grade.membersCount > 0 ? "pointer" : "default",
                          background: "none",
                          border: "none",
                          p: 0,
                          font: "inherit",
                        }}
                      >
                        {grade.membersCount}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Box
                          component="button"
                          type="button"
                          aria-label={`Edit ${grade.name}`}
                          onClick={() => setFormDialog({ open: true, grade })}
                          sx={{ display: "inline-flex", color: "text.secondary", background: "none", border: "none", p: 0, cursor: "pointer", "&:hover": { color: "text.primary" } }}
                        >
                          <PencilSimpleIcon size={16} />
                        </Box>
                        <Switch
                          checked={grade.isActive}
                          onCheckedChange={() => setStatusDialogGrade(grade)}
                          aria-label={grade.isActive ? `Disable ${grade.name}` : `Enable ${grade.name}`}
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

      <GradeFormDialog
        open={formDialog.open}
        onOpenChange={(open) => setFormDialog((previous) => ({ ...previous, open }))}
        grade={formDialog.grade}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      <GradeMembersDialog
        gradeId={membersDialogGrade?.id ?? null}
        gradeName={membersDialogGrade?.name ?? ""}
        onOpenChange={(open) => {
          if (!open) setMembersDialogGrade(null);
        }}
      />

      <GradeStatusDialog
        grade={statusDialogGrade}
        onOpenChange={(open) => {
          if (!open) setStatusDialogGrade(null);
        }}
        onStatusChanged={handleStatusChanged}
      />
    </Box>
  );
}
