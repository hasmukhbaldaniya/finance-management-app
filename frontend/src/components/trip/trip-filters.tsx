"use client";

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
        <input
          id="filter-trip-start-date"
          type="date"
          value={filters.tripStartDate}
          onChange={(event) => onChange({ ...filters, tripStartDate: event.target.value })}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-created-date">Created Date</Label>
        <input
          id="filter-created-date"
          type="date"
          value={filters.createdDate}
          onChange={(event) => onChange({ ...filters, createdDate: event.target.value })}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-status">Status</Label>
        <select
          id="filter-status"
          value={filters.status}
          onChange={(event) => onChange({ ...filters, status: event.target.value as TripStatus | "" })}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          <option value="">All</option>
          {TRIP_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}
