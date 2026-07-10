"use client";

import { Label } from "@/components/ui/label";
import { CLAIM_STATUS_OPTIONS } from "@/utils/constants/claim.constant";
import type { ClaimStatus } from "@/types/claim.type";

export type ClaimFiltersState = {
  createdDate: string;
  status: ClaimStatus | "";
};

type ClaimFiltersProps = {
  filters: ClaimFiltersState;
  onChange: (filters: ClaimFiltersState) => void;
};

// 024's left filter rail — Created Date (exact-calendar-day match, mirroring
// Trip Listing's own resolution) and Status.
export function ClaimFilters({ filters, onChange }: ClaimFiltersProps) {
  return (
    <aside className="w-full shrink-0 space-y-6 border-r border-border p-4 md:w-64">
      <h2 className="text-sm font-semibold">Filter</h2>

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
          onChange={(event) => onChange({ ...filters, status: event.target.value as ClaimStatus | "" })}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          <option value="">All</option>
          {CLAIM_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}
