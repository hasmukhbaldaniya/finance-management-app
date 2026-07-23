"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import { CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { getTrips } from "@/apis/trip";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/utils/helpers/format.helper";
import type { TripListItem } from "@/types/trip.type";

const SEARCH_DEBOUNCE_MS = 250;

// Only the fields this component actually displays — lets a caller pass a
// minimal {id, name} it already has (e.g. reopening a draft claim, which
// only carries the linked trip's id/name, not its full listing shape)
// without fetching the full TripListItem first.
export type TripSelectValue = Pick<TripListItem, "id" | "name">;

type TripSelectProps = {
  value: TripSelectValue | null;
  onChange: (trip: TripListItem) => void;
  placeholder: string;
};

// "Link to Trip" mode's Trip Name dropdown (022) — only status: "new" trips
// owned by the caller appear, searchable by name, with a Filter by Start
// Date control. Mirrors CitySelect's server-backed DropdownMenu+Input shape.
export function TripSelect({ value, onChange, placeholder }: TripSelectProps) {
  const [search, setSearch] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(true);
      getTrips({ search, tripStartDate: tripStartDate || undefined, status: "new", page: 1, pageSize: 20 })
        .then((response) => setTrips(response.trips))
        .catch(() => setTrips([]))
        .finally(() => setIsLoading(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search, tripStartDate]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" sx={{ width: "100%", justifyContent: "space-between", fontWeight: 400 }}>
            <Box component="span" sx={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
              {value ? `${value.name} (#${value.id})` : placeholder}
            </Box>
            <Box component="span" sx={{ flexShrink: 0, display: "flex" }}>
              <CaretDownIcon size={16} />
            </Box>
          </Button>
        }
      />
      <DropdownMenuContent matchTriggerWidth sx={{ p: 1 }}>
        <Stack spacing={1} sx={{ mb: 1 }}>
          <Box sx={{ position: "relative" }}>
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Search trip..."
              sx={{ height: 32, fontSize: "0.875rem" }}
              startAdornment={
                <InputAdornment position="start">
                  <MagnifyingGlassIcon size={14} />
                </InputAdornment>
              }
            />
          </Box>
          <Box onKeyDown={(event) => event.stopPropagation()}>
            <DatePicker value={tripStartDate} onChange={setTripStartDate} placeholder="Filter by Start Date" sx={{ height: 32, fontSize: "0.875rem" }} />
          </Box>
        </Stack>
        <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
          {isLoading ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1.5 }}>
              Searching…
            </Typography>
          ) : trips.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1.5 }}>
              No matching trips.
            </Typography>
          ) : (
            trips.map((trip) => (
              <DropdownMenuItem key={trip.id} onClick={() => onChange(trip)}>
                <Box component="span" sx={{ display: "flex", flexDirection: "column" }}>
                  <Box component="span">
                    {trip.name} <Box component="span" sx={{ color: "text.secondary" }}>(#{trip.id})</Box>
                  </Box>
                  <Box component="span" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                    Starts {formatDateTime(trip.startAt)}
                  </Box>
                </Box>
              </DropdownMenuItem>
            ))
          )}
        </Box>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
