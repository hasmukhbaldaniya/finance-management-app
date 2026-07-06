"use client";

import { CaretDownIcon, CaretUpIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";

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

  function renderSortIcon(column: GradeSortBy) {
    if (sortBy !== column) return null;
    return sortDir === "asc" ? <CaretUpIcon className="inline size-3" /> : <CaretDownIcon className="inline size-3" />;
  }

  const sentinelRef = useInfiniteScroll(handleLoadMore, hasMore, isLoadingMore);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Grade Management</h1>
        <Button onClick={() => setFormDialog({ open: true, grade: null })}>New Grade</Button>
      </div>

      <div className="mt-4">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search grades…"
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
      ) : grades.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No grades found.</p>
      ) : (
        <div className="mt-6 rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1 font-medium"
                  >
                    Grade {renderSortIcon("name")}
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
              {grades.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell>{grade.name}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => (grade.membersCount > 0 ? setMembersDialogGrade(grade) : undefined)}
                      className={cn(
                        "underline-offset-4",
                        grade.membersCount > 0 ? "text-primary hover:underline" : "cursor-default text-muted-foreground"
                      )}
                    >
                      {grade.membersCount}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={`Edit ${grade.name}`}
                        onClick={() => setFormDialog({ open: true, grade })}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <PencilSimpleIcon className="size-4" />
                      </button>
                      <Switch
                        checked={grade.isActive}
                        onCheckedChange={() => setStatusDialogGrade(grade)}
                        aria-label={grade.isActive ? `Disable ${grade.name}` : `Enable ${grade.name}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {hasMore ? <div ref={sentinelRef} aria-hidden className="h-px" /> : null}
          {isLoadingMore ? (
            <div className="flex justify-center border-t border-border p-3">
              <Spinner />
            </div>
          ) : null}
        </div>
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
    </div>
  );
}
