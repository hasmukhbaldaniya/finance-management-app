// Ported from frontend/src/app/(private)/trips/[id]/edit/page.tsx.
// next/navigation's useParams -> react-router's useParams (identical shape).
import { useParams } from "react-router";
import { EditTripForm } from "@/components/trip/edit-trip-form";
import { useIdRemap } from "@/hooks/useIdRemap";
import { ROUTES } from "@/utils/constants/route.constant";

export function TripEditScreen() {
  const params = useParams<{ id: string }>();
  const tripId = Number(params.id);
  useIdRemap(tripId, ROUTES.tripEdit);
  return <EditTripForm tripId={tripId} />;
}
