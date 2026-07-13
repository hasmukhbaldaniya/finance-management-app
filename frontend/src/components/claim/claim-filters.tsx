"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
    <Stack component="aside" spacing={3} sx={{ width: { xs: "100%", md: 256 }, flexShrink: 0, borderRight: 1, borderColor: "divider", p: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Filter
      </Typography>

      <Stack spacing={1}>
        <Label htmlFor="filter-created-date">Created Date</Label>
        <DatePicker id="filter-created-date" value={filters.createdDate} onChange={(value) => onChange({ ...filters, createdDate: value })} sx={{ height: 32 }} />
      </Stack>

      <Stack spacing={1}>
        <Label htmlFor="filter-status">Status</Label>
        <SelectField
          id="filter-status"
          value={filters.status}
          onValueChange={(value) => onChange({ ...filters, status: value as ClaimStatus | "" })}
          placeholder="All"
          options={[{ value: "", label: "All" }, ...CLAIM_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))]}
        />
      </Stack>
    </Stack>
  );
}
