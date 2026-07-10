"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { getClaims } from "@/apis/claim";
import { ClaimFilters, type ClaimFiltersState } from "@/components/claim/claim-filters";
import { ClaimRow } from "@/components/claim/claim-row";
import { DeleteClaimDialog } from "@/components/claim/delete-claim-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { cn } from "@/lib/utils";
import type { ClaimListItem } from "@/types/claim.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

type ClaimTab = "mine" | "split-request";

export default function ClaimsPage() {
  const [tab, setTab] = useState<ClaimTab>("mine");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ClaimFiltersState>({ createdDate: "", status: "" });

  const [claims, setClaims] = useState<ClaimListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  const [deleteTarget, setDeleteTarget] = useState<ClaimListItem | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(undefined);

    getClaims({
      search,
      createdDate: filters.createdDate || undefined,
      status: filters.status || undefined,
      splitOrigin: tab === "split-request",
      page: 1,
      pageSize: PAGE_SIZE,
    })
      .then(({ claims: fetched, hasMore: fetchedHasMore }) => {
        if (!isMounted) return;
        setClaims(fetched);
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
  }, [search, filters, tab]);

  async function handleLoadMore(): Promise<void> {
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { claims: fetched, hasMore: fetchedHasMore } = await getClaims({
        search,
        createdDate: filters.createdDate || undefined,
        status: filters.status || undefined,
        splitOrigin: tab === "split-request",
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setClaims((previous) => [...previous, ...fetched]);
      setPage(nextPage);
      setHasMore(fetchedHasMore);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoadingMore(false);
    }
  }

  const sentinelRef = useInfiniteScroll(handleLoadMore, hasMore, isLoadingMore);

  return (
    <div className="flex flex-col md:flex-row">
      <ClaimFilters filters={filters} onChange={setFilters} />

      <div className="min-w-0 flex-1 space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">My Claim</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlassIcon size={14} className="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search"
                className="h-8 w-48 pl-7"
              />
            </div>
            <Link href={ROUTES.CLAIM_NEW} className={cn(buttonVariants())}>
              <PlusIcon size={16} /> Create Claim
            </Link>
          </div>
        </div>

        <div className="flex gap-1 border-b border-border">
          {(
            [
              { key: "mine", label: "My Claim" },
              { key: "split-request", label: "Split Request" },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setTab(option.key)}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === option.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : loadError ? (
          <p className="py-16 text-center text-sm text-destructive">{loadError}</p>
        ) : claims.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">{tab === "mine" ? "No claims yet." : "No split claims yet."}</p>
            {tab === "mine" ? (
              <Link href={ROUTES.CLAIM_NEW} className={cn(buttonVariants())}>
                <PlusIcon size={16} /> Create Claim
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {claims.map((claim) => (
                <ClaimRow key={claim.id} claim={claim} onDelete={setDeleteTarget} />
              ))}
            </div>
            {hasMore ? (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {isLoadingMore ? <Spinner className="size-5" /> : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      <DeleteClaimDialog
        claim={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={(claimId) => setClaims((previous) => previous.filter((claim) => claim.id !== claimId))}
      />
    </div>
  );
}
