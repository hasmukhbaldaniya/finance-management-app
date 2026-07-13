import type { ReactNode } from "react";
import Link from "next/link";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/utils/constants/route.constant";
import { countryCodeToFlagEmoji, formatTripOverviewDate, formatTripOverviewDateTime } from "@/utils/helpers/format.helper";
import type { TripDetail } from "@/types/trip.type";

function OverviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function LocationValue({ city, countryName, countryCode }: { city: string; countryName: string; countryCode: string }) {
  return (
    <span title={countryName}>
      {countryCodeToFlagEmoji(countryCode)} {city}
    </span>
  );
}

type TripOverviewCardProps = {
  trip: TripDetail;
};

// 020's right panel — every field read-only, sourced from 018's Create Trip
// data. Per 021-trip-edit.md, "Edit" is enabled only while status is "new";
// any other status renders it disabled with an explanatory tooltip rather
// than linking somewhere that would just reject the request.
export function TripOverviewCard({ trip }: TripOverviewCardProps) {
  const canEdit = trip.status === "new";

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold">Trip Overview</h2>
        {canEdit ? (
          <Button component={Link} href={ROUTES.tripEdit(trip.id)} variant="outline" size="sm">
            <PencilSimpleIcon size={14} /> Edit
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled title="Only trips with New status can be edited">
            <PencilSimpleIcon size={14} /> Edit
          </Button>
        )}
      </div>
      <div className="divide-y divide-border px-4">
        <OverviewRow label="Trip ID" value={trip.id} />
        <OverviewRow label="Trip Name" value={trip.name} />
        <OverviewRow label="Start Date & Time" value={formatTripOverviewDateTime(trip.startAt)} />
        <OverviewRow label="End Date & Time" value={formatTripOverviewDateTime(trip.endAt)} />
        <OverviewRow
          label="Start Location"
          value={<LocationValue city={trip.startCity.name} countryName={trip.startCity.countryName} countryCode={trip.startCity.countryCode} />}
        />
        <OverviewRow
          label="End Location"
          value={<LocationValue city={trip.endCity.name} countryName={trip.endCity.countryName} countryCode={trip.endCity.countryCode} />}
        />
        <OverviewRow label="Created On" value={formatTripOverviewDate(trip.createdAt)} />
      </div>
    </div>
  );
}
