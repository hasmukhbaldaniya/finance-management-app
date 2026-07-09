"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { getTrips } from "@/apis/trip";
import { DeleteTripDialog } from "@/components/trip/delete-trip-dialog";
import { TripFilters, type TripFiltersState } from "@/components/trip/trip-filters";
import { TripRow } from "@/components/trip/trip-row";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { cn } from "@/lib/utils";
import type { TripListItem } from "@/types/trip.type";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function TripsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TripFiltersState>({ tripStartDate: "", createdDate: "", status: "" });

  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  const [deleteTarget, setDeleteTarget] = useState<TripListItem | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(undefined);

    getTrips({
      search,
      tripStartDate: filters.tripStartDate || undefined,
      createdDate: filters.createdDate || undefined,
      status: filters.status || undefined,
      page: 1,
      pageSize: PAGE_SIZE,
    })
      .then(({ trips: fetched, hasMore: fetchedHasMore }) => {
        if (!isMounted) return;
        setTrips(fetched);
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
  }, [search, filters]);

  async function handleLoadMore(): Promise<void> {
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { trips: fetched, hasMore: fetchedHasMore } = await getTrips({
        search,
        tripStartDate: filters.tripStartDate || undefined,
        createdDate: filters.createdDate || undefined,
        status: filters.status || undefined,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setTrips((previous) => [...previous, ...fetched]);
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
      <TripFilters filters={filters} onChange={setFilters} />

      <div className="min-w-0 flex-1 space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">My Trips</h1>
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
            {/* Create Claim isn't specified anywhere yet (019's Out of
                Scope) — rendered disabled rather than a dead-end no-op. */}
            <Button type="button" variant="secondary" disabled title="Coming soon">
              Create Claim
            </Button>
            <Link href={ROUTES.TRIP_NEW} className={cn(buttonVariants())}>
              <PlusIcon size={16} /> Create Trip
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-6" />
          </div>
        ) : loadError ? (
          <p className="py-16 text-center text-sm text-destructive">{loadError}</p>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">No trips yet.</p>
            <Link href={ROUTES.TRIP_NEW} className={cn(buttonVariants())}>
              <PlusIcon size={16} /> Create Trip
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {trips.map((trip) => (
                <TripRow key={trip.id} trip={trip} onDelete={setDeleteTarget} />
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

      <DeleteTripDialog
        trip={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={(tripId) => setTrips((previous) => previous.filter((trip) => trip.id !== tripId))}
      />
    </div>
  );
}
