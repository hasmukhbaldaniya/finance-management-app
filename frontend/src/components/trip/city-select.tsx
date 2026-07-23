"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
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
          <Button type="button" variant="outline" sx={{ width: "100%", justifyContent: "space-between", fontWeight: 400 }}>
            <Box component="span" sx={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
              {value ? `${value.name}, ${value.countryName}` : placeholder}
            </Box>
            <Box component="span" sx={{ flexShrink: 0, display: "flex" }}>
              <CaretDownIcon size={16} />
            </Box>
          </Button>
        }
      />
      <DropdownMenuContent matchTriggerWidth sx={{ p: 1 }}>
        <Box sx={{ position: "relative", mb: 1 }}>
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Search city or country..."
            sx={{ height: 32, fontSize: "0.875rem" }}
            startAdornment={
              <InputAdornment position="start">
                <MagnifyingGlassIcon size={14} />
              </InputAdornment>
            }
          />
        </Box>
        <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
          {isLoading ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1.5 }}>
              Searching…
            </Typography>
          ) : cities.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1.5 }}>
              No matches.
            </Typography>
          ) : (
            cities.map((city) => (
              <DropdownMenuItem key={city.id} onClick={() => onChange(city)}>
                {city.name}, {city.countryName}
              </DropdownMenuItem>
            ))
          )}
        </Box>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
