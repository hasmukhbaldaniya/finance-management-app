// Ported from frontend/src/app/(private)/trips/[id]/edit/page.tsx.
// next/navigation's useParams -> react-router's useParams (identical shape).
import { useParams } from "react-router";
import { EditTripForm } from "@/components/trip/edit-trip-form";

export function TripEditScreen() {
  const params = useParams<{ id: string }>();
  return <EditTripForm tripId={Number(params.id)} />;
}
