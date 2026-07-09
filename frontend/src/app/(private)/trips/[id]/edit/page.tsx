"use client";

import { useParams } from "next/navigation";
import { EditTripForm } from "@/components/trip/edit-trip-form";

export default function EditTripPage() {
  const params = useParams<{ id: string }>();
  return <EditTripForm tripId={Number(params.id)} />;
}
