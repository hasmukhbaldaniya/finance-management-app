"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BriefcaseIcon, ChatCircleDotsIcon } from "@phosphor-icons/react";
import { getTripDetail } from "@/apis/trip";
import { EmptyExpenseList } from "@/components/trip/empty-expense-list";
import { TripOverviewCard } from "@/components/trip/trip-overview-card";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import type { TripDetail } from "@/types/trip.type";

export default function TripDetailsPage() {
  const params = useParams<{ id: string }>();
  const tripId = Number(params.id);

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    getTripDetail(tripId)
      .then((response) => {
        if (isMounted) setTrip(response.trip);
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
      <div className="flex justify-center py-16">
        <Spinner size={24} />
      </div>
    );
  }

  if (loadError || !trip) {
    return <p className="px-6 py-16 text-center text-sm text-destructive">{loadError ?? "This trip could not be found."}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 border-b border-border pb-4 text-sm">
        <Link href={ROUTES.TRIPS} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <BriefcaseIcon size={16} /> My Trips
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="flex items-center gap-1.5 font-medium text-primary">
          <ChatCircleDotsIcon size={16} /> View Trip Claim
        </span>
      </nav>

      <h1 className="text-2xl font-semibold tracking-tight">{trip.name}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EmptyExpenseList />
        </div>
        <div>
          <TripOverviewCard trip={trip} />
        </div>
      </div>
    </div>
  );
}
