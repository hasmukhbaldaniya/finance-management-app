"use client";

import { useState } from "react";
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
          <Button type="button" variant="outline" className="w-full justify-between font-normal">
            <span className="truncate text-left">{selected ? selected.name : "Select category"}</span>
            <CaretDownIcon size={16} className="shrink-0" />
          </Button>
        }
      />
      <DropdownMenuContent matchTriggerWidth sx={{ p: 1 }}>
        <div className="relative mb-2">
          <MagnifyingGlassIcon size={14} className="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Search category..."
            className="h-8 pl-7 text-sm"
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No matches.</p>
          ) : (
            visible.map((category) => (
              <DropdownMenuItem key={category.id} onClick={() => onChange(category.id)}>
                {category.name}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
