"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@/components/date-picker";
import { SelectField } from "@/components/select-field";
import { Label } from "@/components/ui/label";
import { TRIP_STATUS_OPTIONS } from "@/utils/constants/trip.constant";
import type { TripStatus } from "@/types/trip.type";

export type TripFiltersState = {
  tripStartDate: string;
  createdDate: string;
  status: TripStatus | "";
};

type TripFiltersProps = {
  filters: TripFiltersState;
  onChange: (filters: TripFiltersState) => void;
};

// 019's left filter rail — Trip Start Date, Created Date (both exact-
// calendar-day matches, per that story's Open Questions resolution), and
// Status. Filters combine with AND.
export function TripFilters({ filters, onChange }: TripFiltersProps) {
  return (
    <Stack component="aside" spacing={3} sx={{ width: { xs: "100%", md: 256 }, flexShrink: 0, borderRight: 1, borderColor: "divider", p: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Filter
      </Typography>

      <Stack spacing={1}>
        <Label htmlFor="filter-trip-start-date">Trip Start Date</Label>
        <DatePicker
          id="filter-trip-start-date"
          value={filters.tripStartDate}
          onChange={(value) => onChange({ ...filters, tripStartDate: value })}
          sx={{ height: 40 }}
        />
      </Stack>

      <Stack spacing={1}>
        <Label htmlFor="filter-created-date">Created Date</Label>
        <DatePicker id="filter-created-date" value={filters.createdDate} onChange={(value) => onChange({ ...filters, createdDate: value })} sx={{ height: 40 }} />
      </Stack>

      <Stack spacing={1}>
        <Label htmlFor="filter-status">Status</Label>
        <SelectField
          id="filter-status"
          value={filters.status}
          onValueChange={(value) => onChange({ ...filters, status: value as TripStatus | "" })}
          placeholder="All"
          options={[{ value: "", label: "All" }, ...TRIP_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))]}
        />
      </Stack>
    </Stack>
  );
}
