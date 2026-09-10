"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import { CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ClaimableCategory } from "@/types/claim.type";

type CategorySelectProps = {
  categories: ClaimableCategory[];
  value: number | null;
  onChange: (categoryId: number) => void;
};

// Expense panel's Category dropdown (022) — active + enabled categories
// only (already filtered server-side by getClaimableCategories), searchable
// over an in-memory list, same shape as ziptrrip-category-picker.tsx.
export function CategorySelect({ categories, value, onChange }: CategorySelectProps) {
  const [search, setSearch] = useState("");
  const selected = categories.find((category) => category.id === value) ?? null;
  const visible = categories.filter((category) => category.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" sx={{ width: "100%", justifyContent: "space-between", fontWeight: 400 }}>
            <Box component="span" sx={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
              {selected ? selected.name : "Select category"}
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
            placeholder="Search category..."
            sx={{ height: 32, fontSize: "0.875rem" }}
            startAdornment={
              <InputAdornment position="start">
                <MagnifyingGlassIcon size={14} />
              </InputAdornment>
            }
          />
        </Box>
        <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
          {visible.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1.5 }}>
              No matches.
            </Typography>
          ) : (
            visible.map((category) => (
              <DropdownMenuItem key={category.id} onClick={() => onChange(category.id)}>
                {category.name}
              </DropdownMenuItem>
            ))
          )}
        </Box>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
