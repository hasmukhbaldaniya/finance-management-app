"use client";

import { useEffect, useState } from "react";
import { CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { getCities } from "@/apis/city";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { City } from "@/types/city.type";

const SEARCH_DEBOUNCE_MS = 250;

type CitySelectProps = {
  value: City | null;
  onChange: (city: City) => void;
  placeholder: string;
};

// Start/End Location's searchable dropdown (018's Create Trip) — backed by
// GET /api/cities, debounced, worldwide (Country → City master catalog).
export function CitySelect({ value, onChange, placeholder }: CitySelectProps) {
  const [search, setSearch] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(true);
      getCities({ search })
        .then((response) => setCities(response.cities))
        .catch(() => setCities([]))
        .finally(() => setIsLoading(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" className="w-full justify-between font-normal">
            <span className="truncate text-left">{value ? `${value.name}, ${value.countryName}` : placeholder}</span>
            <CaretDownIcon size={16} className="shrink-0" />
          </Button>
        }
      />
      <DropdownMenuContent className="w-(--anchor-width) p-2">
        <div className="relative mb-2">
          <MagnifyingGlassIcon size={14} className="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Search city or country..."
            className="h-8 pl-7 text-sm"
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {isLoading ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Searching…</p>
          ) : cities.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No matches.</p>
          ) : (
            cities.map((city) => (
              <DropdownMenuItem key={city.id} onClick={() => onChange(city)}>
                {city.name}, {city.countryName}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
