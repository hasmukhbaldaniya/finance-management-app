"use client";

import { useEffect, useState } from "react";
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
          <Button type="button" variant="outline" className="w-full justify-between font-normal">
            <span className="truncate text-left">{value ? `${value.name} (#${value.id})` : placeholder}</span>
            <CaretDownIcon size={16} className="shrink-0" />
          </Button>
        }
      />
      <DropdownMenuContent matchTriggerWidth sx={{ p: 1 }}>
        <div className="mb-2 space-y-2">
          <div className="relative">
            <MagnifyingGlassIcon size={14} className="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Search trip..."
              className="h-8 pl-7 text-sm"
            />
          </div>
          <div onKeyDown={(event) => event.stopPropagation()}>
            <DatePicker value={tripStartDate} onChange={setTripStartDate} placeholder="Filter by Start Date" className="h-8 text-sm" />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {isLoading ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Searching…</p>
          ) : trips.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No matching trips.</p>
          ) : (
            trips.map((trip) => (
              <DropdownMenuItem key={trip.id} onClick={() => onChange(trip)}>
                <span className="flex flex-col">
                  <span>
                    {trip.name} <span className="text-muted-foreground">(#{trip.id})</span>
                  </span>
                  <span className="text-xs text-muted-foreground">Starts {formatDateTime(trip.startAt)}</span>
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
