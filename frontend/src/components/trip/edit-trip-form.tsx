"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getTripDetail } from "@/apis/trip";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { ROUTES } from "@/utils/constants/route.constant";
import { toDatetimeLocalValue } from "@/utils/helpers/format.helper";
import { TripForm, type TripFormInitialValues } from "./trip-form";

type EditTripFormProps = {
  tripId: number;
};

// 021's Edit Trip — loads the trip, converts it into TripForm's initial
// values, and defensively redirects back to Trip Details if the trip isn't
// (or is no longer) status "new" — the Edit button being disabled client-side
// is the primary guard, but a direct URL visit needs the same check, and the
// backend's own 409 on submit is the final one (see 021's Edge Cases on a
// status changing out from under an open Edit screen).
export function EditTripForm({ tripId }: EditTripFormProps) {
  const router = useRouter();
  const [initialValues, setInitialValues] = useState<TripFormInitialValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    getTripDetail(tripId)
      .then((response) => {
        if (!isMounted) return;
        const { trip } = response;
        if (trip.status !== "new") {
          toast.error("Only trips with New status can be edited.");
          router.replace(ROUTES.tripDetails(tripId));
          return;
        }
        setInitialValues({
          name: trip.name,
          startAt: toDatetimeLocalValue(trip.startAt),
          endAt: toDatetimeLocalValue(trip.endAt),
          startCity: { id: trip.startCity.id, name: trip.startCity.name, countryId: trip.startCity.countryId ?? 0, countryName: trip.startCity.countryName },
          endCity: { id: trip.endCity.id, name: trip.endCity.name, countryId: trip.endCity.countryId ?? 0, countryName: trip.endCity.countryName },
        });
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
  }, [tripId, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (loadError || !initialValues) {
    return <p className="px-6 py-16 text-center text-sm text-destructive">{loadError ?? "This trip could not be found."}</p>;
  }

  return <TripForm mode="edit" tripId={tripId} initialValues={initialValues} />;
}
