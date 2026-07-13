"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { getClaims } from "@/apis/claim";
import { getSplitRequests } from "@/apis/split-request";
import { ClaimFilters, type ClaimFiltersState } from "@/components/claim/claim-filters";
import { ClaimRow } from "@/components/claim/claim-row";
import { DeleteClaimDialog } from "@/components/claim/delete-claim-dialog";
import { SplitRequestRow } from "@/components/claim/split-request-row";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { ClaimListItem } from "@/types/claim.type";
import type { SplitRequestListItem } from "@/types/split-request.type";
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
  const [requestedOn, setRequestedOn] = useState("");

  const [claims, setClaims] = useState<ClaimListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  // 025's Split Request Inbox — this tab's own data source is the
  // ExpenseSplitRequest queue the caller was invited into, a completely
  // different dataset from "My Claim" above, not a filtered view of it.
  const [splitRequests, setSplitRequests] = useState<SplitRequestListItem[]>([]);
  const [splitRequestsPage, setSplitRequestsPage] = useState(1);
  const [splitRequestsHasMore, setSplitRequestsHasMore] = useState(false);
  const [isLoadingSplitRequests, setIsLoadingSplitRequests] = useState(true);
  const [isLoadingMoreSplitRequests, setIsLoadingMoreSplitRequests] = useState(false);
  const [splitRequestsError, setSplitRequestsError] = useState<string | undefined>();

  const [deleteTarget, setDeleteTarget] = useState<ClaimListItem | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (tab !== "mine") return;
    let isMounted = true;
    setIsLoading(true);
    setLoadError(undefined);

    getClaims({
      search,
      createdDate: filters.createdDate || undefined,
      status: filters.status || undefined,
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

  useEffect(() => {
    if (tab !== "split-request") return;
    let isMounted = true;
    setIsLoadingSplitRequests(true);
    setSplitRequestsError(undefined);

    getSplitRequests({ search, requestedOn: requestedOn || undefined, page: 1, pageSize: PAGE_SIZE })
      .then(({ requests, hasMore: fetchedHasMore }) => {
        if (!isMounted) return;
        setSplitRequests(requests);
        setSplitRequestsPage(1);
        setSplitRequestsHasMore(fetchedHasMore);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setSplitRequestsError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSplitRequests(false);
      });

    return () => {
      isMounted = false;
    };
  }, [search, requestedOn, tab]);

  async function handleLoadMore(): Promise<void> {
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { claims: fetched, hasMore: fetchedHasMore } = await getClaims({
        search,
        createdDate: filters.createdDate || undefined,
        status: filters.status || undefined,
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

  async function handleLoadMoreSplitRequests(): Promise<void> {
    setIsLoadingMoreSplitRequests(true);
    try {
      const nextPage = splitRequestsPage + 1;
      const { requests, hasMore: fetchedHasMore } = await getSplitRequests({
        search,
        requestedOn: requestedOn || undefined,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setSplitRequests((previous) => [...previous, ...requests]);
      setSplitRequestsPage(nextPage);
      setSplitRequestsHasMore(fetchedHasMore);
    } catch (error) {
      setSplitRequestsError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoadingMoreSplitRequests(false);
    }
  }

  const sentinelRef = useInfiniteScroll(handleLoadMore, hasMore, isLoadingMore);
  const splitRequestSentinelRef = useInfiniteScroll(handleLoadMoreSplitRequests, splitRequestsHasMore, isLoadingMoreSplitRequests);

  return (
    <Stack direction={{ xs: "column", md: "row" }}>
      {tab === "mine" ? (
        <ClaimFilters filters={filters} onChange={setFilters} />
      ) : (
        <Stack component="aside" spacing={3} sx={{ width: { xs: "100%", md: 256 }, flexShrink: 0, borderRight: 1, borderColor: "divider", p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Filter
          </Typography>
          <Stack spacing={1}>
            <Label htmlFor="filter-requested-on">Requested On</Label>
            <DatePicker id="filter-requested-on" value={requestedOn} onChange={setRequestedOn} sx={{ height: 32 }} />
          </Stack>
        </Stack>
      )}

      <Stack spacing={3} sx={{ minWidth: 0, flex: 1, p: 3 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
            My Claim
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
            <Button component={Link} href={ROUTES.CLAIM_NEW}>
              <PlusIcon size={16} /> Create Claim
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ borderBottom: 1, borderColor: "divider" }}>
          {(
            [
              { key: "mine", label: "My Claim" },
              { key: "split-request", label: "Split Request" },
            ] as const
          ).map((option) => (
            <Box
              component="button"
              key={option.key}
              type="button"
              onClick={() => setTab(option.key)}
              sx={{
                borderBottom: 2,
                borderColor: tab === option.key ? "primary.main" : "transparent",
                px: 2,
                py: 1,
                fontSize: "0.875rem",
                fontWeight: 500,
                background: "none",
                border: "none",
                borderBottomWidth: 2,
                borderBottomStyle: "solid",
                cursor: "pointer",
                color: tab === option.key ? "text.primary" : "text.secondary",
                transition: "color 0.15s",
                "&:hover": { color: "text.primary" },
              }}
            >
              {option.label}
            </Box>
          ))}
        </Stack>

        {tab === "mine" ? (
          isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <Spinner size={24} />
            </Box>
          ) : loadError ? (
            <Typography variant="body2" color="error" sx={{ py: 8, textAlign: "center" }}>
              {loadError}
            </Typography>
          ) : claims.length === 0 ? (
            <Stack spacing={1.5} sx={{ alignItems: "center", borderRadius: 2, border: 1, borderStyle: "dashed", borderColor: "divider", py: 8, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No claims yet.
              </Typography>
              <Button component={Link} href={ROUTES.CLAIM_NEW}>
                <PlusIcon size={16} /> Create Claim
              </Button>
            </Stack>
          ) : (
            <>
              <Stack spacing={2}>
                {claims.map((claim) => (
                  <ClaimRow key={claim.id} claim={claim} onDelete={setDeleteTarget} />
                ))}
              </Stack>
              {hasMore ? (
                <Box ref={sentinelRef} sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  {isLoadingMore ? <Spinner size={20} /> : null}
                </Box>
              ) : null}
            </>
          )
        ) : isLoadingSplitRequests ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <Spinner size={24} />
          </Box>
        ) : splitRequestsError ? (
          <Typography variant="body2" color="error" sx={{ py: 8, textAlign: "center" }}>
            {splitRequestsError}
          </Typography>
        ) : splitRequests.length === 0 ? (
          <Stack spacing={1.5} sx={{ alignItems: "center", borderRadius: 2, border: 1, borderStyle: "dashed", borderColor: "divider", py: 8, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No split requests yet.
            </Typography>
          </Stack>
        ) : (
          <>
            <Stack spacing={2}>
              {splitRequests.map((request) => (
                <SplitRequestRow key={request.id} request={request} />
              ))}
            </Stack>
            {splitRequestsHasMore ? (
              <Box ref={splitRequestSentinelRef} sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                {isLoadingMoreSplitRequests ? <Spinner size={20} /> : null}
              </Box>
            ) : null}
          </>
        )}
      </Stack>

      <DeleteClaimDialog
        claim={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={(claimId) => setClaims((previous) => previous.filter((claim) => claim.id !== claimId))}
      />
    </Stack>
  );
}
