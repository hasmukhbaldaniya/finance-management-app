"use client";

import { DatePicker } from "@/components/date-picker";
import { SelectField } from "@/components/select-field";
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
        <DatePicker id="filter-created-date" value={filters.createdDate} onChange={(value) => onChange({ ...filters, createdDate: value })} className="h-8" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-status">Status</Label>
        <SelectField
          id="filter-status"
          value={filters.status}
          onValueChange={(value) => onChange({ ...filters, status: value as ClaimStatus | "" })}
          placeholder="All"
          options={[{ value: "", label: "All" }, ...CLAIM_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))]}
        />
      </div>
    </aside>
  );
}
