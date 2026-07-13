import type { ReactNode } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/utils/constants/route.constant";
import { countryCodeToFlagEmoji, formatTripOverviewDate, formatTripOverviewDateTime } from "@/utils/helpers/format.helper";
import type { TripDetail } from "@/types/trip.type";

function OverviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, py: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}

function LocationValue({ city, countryName, countryCode }: { city: string; countryName: string; countryCode: string }) {
  return (
    <Box component="span" title={countryName}>
      {countryCodeToFlagEmoji(countryCode)} {city}
    </Box>
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
    <Box sx={{ borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Trip Overview
        </Typography>
        {canEdit ? (
          <Button component={Link} href={ROUTES.tripEdit(trip.id)} variant="outline" size="sm">
            <PencilSimpleIcon size={14} /> Edit
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled title="Only trips with New status can be edited">
            <PencilSimpleIcon size={14} /> Edit
          </Button>
        )}
      </Stack>
      <Stack sx={{ px: 2, "& > *:not(:last-child)": { borderBottom: 1, borderColor: "divider" } }}>
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
      </Stack>
    </Box>
  );
}
