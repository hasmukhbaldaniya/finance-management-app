"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { getTrips } from "@/apis/trip";
import { DeleteTripDialog } from "@/components/trip/delete-trip-dialog";
import { TripFilters, type TripFiltersState } from "@/components/trip/trip-filters";
import { TripRow } from "@/components/trip/trip-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
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
    <Stack direction={{ xs: "column", md: "row" }}>
      <TripFilters filters={filters} onChange={setFilters} />

      <Stack spacing={3} sx={{ minWidth: 0, flex: 1, p: 3 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
            My Trips
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search"
              sx={{ height: 32, width: 192 }}
              startAdornment={
                <InputAdornment position="start">
                  <MagnifyingGlassIcon size={14} />
                </InputAdornment>
              }
            />
            {/* Create Claim isn't specified anywhere yet (019's Out of
                Scope) — rendered disabled rather than a dead-end no-op. */}
            <Button type="button" variant="secondary" disabled title="Coming soon">
              Create Claim
            </Button>
            <Button component={Link} href={ROUTES.TRIP_NEW}>
              <PlusIcon size={16} /> Create Trip
            </Button>
          </Stack>
        </Stack>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <Spinner size={24} />
          </Box>
        ) : loadError ? (
          <Typography variant="body2" color="error" sx={{ py: 8, textAlign: "center" }}>
            {loadError}
          </Typography>
        ) : trips.length === 0 ? (
          <Stack spacing={1.5} sx={{ alignItems: "center", borderRadius: 2, border: 1, borderStyle: "dashed", borderColor: "divider", py: 8, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No trips yet.
            </Typography>
            <Button component={Link} href={ROUTES.TRIP_NEW}>
              <PlusIcon size={16} /> Create Trip
            </Button>
          </Stack>
        ) : (
          <>
            <Stack spacing={2}>
              {trips.map((trip) => (
                <TripRow key={trip.id} trip={trip} onDelete={setDeleteTarget} />
              ))}
            </Stack>
            {hasMore ? (
              <Box ref={sentinelRef} sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                {isLoadingMore ? <Spinner size={20} /> : null}
              </Box>
            ) : null}
          </>
        )}
      </Stack>

      <DeleteTripDialog
        trip={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={(tripId) => setTrips((previous) => previous.filter((trip) => trip.id !== tripId))}
      />
    </Stack>
  );
}
