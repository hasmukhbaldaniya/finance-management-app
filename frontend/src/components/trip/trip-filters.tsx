"use client";

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
    <aside className="w-full shrink-0 space-y-6 border-r border-border p-4 md:w-64">
      <h2 className="text-sm font-semibold">Filter</h2>

      <div className="space-y-2">
        <Label htmlFor="filter-trip-start-date">Trip Start Date</Label>
        <DatePicker
          id="filter-trip-start-date"
          value={filters.tripStartDate}
          onChange={(value) => onChange({ ...filters, tripStartDate: value })}
          className="h-8"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-created-date">Created Date</Label>
        <DatePicker id="filter-created-date" value={filters.createdDate} onChange={(value) => onChange({ ...filters, createdDate: value })} className="h-8" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-status">Status</Label>
        <SelectField
          id="filter-status"
          value={filters.status}
          onValueChange={(value) => onChange({ ...filters, status: value as TripStatus | "" })}
          placeholder="All"
          options={[{ value: "", label: "All" }, ...TRIP_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))]}
        />
      </div>
    </aside>
  );
}
