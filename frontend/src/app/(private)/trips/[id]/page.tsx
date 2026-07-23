"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import { BriefcaseIcon, ChatCircleDotsIcon } from "@phosphor-icons/react";
import { getTripDetail } from "@/apis/trip";
import { EmptyExpenseList } from "@/components/trip/empty-expense-list";
import { TripExpenseList } from "@/components/trip/trip-expense-list";
import { TripOverviewCard } from "@/components/trip/trip-overview-card";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import type { TripDetail, TripExpenseRow } from "@/types/trip.type";

export default function TripDetailsPage() {
  const params = useParams<{ id: string }>();
  const tripId = Number(params.id);

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [expenses, setExpenses] = useState<TripExpenseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    getTripDetail(tripId)
      .then((response) => {
        if (!isMounted) return;
        setTrip(response.trip);
        setExpenses(response.expenses);
      })
      .catch((error: unknown) => {
        if (isMounted) setLoadError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tripId]);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <Spinner size={24} />
      </Box>
    );
  }

  if (loadError || !trip) {
    return (
      <Typography variant="body2" color="error" sx={{ px: 3, py: 8, textAlign: "center" }}>
        {loadError ?? "This trip could not be found."}
      </Typography>
    );
  }

  return (
    <Stack spacing={3} sx={{ mx: "auto", maxWidth: 1152, px: 3, py: 3 }}>
      <Stack component="nav" direction="row" spacing={1} aria-label="Breadcrumb" sx={{ alignItems: "center", borderBottom: 1, borderColor: "divider", pb: 2, fontSize: "0.875rem" }}>
        <MuiLink component={Link} href={ROUTES.TRIPS} color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.75, "&:hover": { color: "text.primary" } }}>
          <BriefcaseIcon size={16} /> My Trips
        </MuiLink>
        <Typography color="text.secondary">/</Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", fontWeight: 500, color: "primary.main" }}>
          <ChatCircleDotsIcon size={16} /> View Trip Claim
        </Stack>
      </Stack>

      <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
        {trip.name}
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 3 }}>
        <Box>{expenses.length > 0 ? <TripExpenseList expenses={expenses} /> : <EmptyExpenseList />}</Box>
        <Box>
          <TripOverviewCard trip={trip} />
        </Box>
      </Box>
    </Stack>
  );
}
