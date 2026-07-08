"use client";

import { useState } from "react";
import { CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ZIPTRRIP_CATEGORIES } from "@/utils/constants/category.constant";

type ZiptrripCategoryPickerProps = {
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
};

// The "Map Ziptrrip Category" searchable checklist — a static, hardcoded list
// per 013's own instruction, not a live integration. Built on
// DropdownMenuCheckboxItem per frontend/CLAUDE.md's guidance for any future
// multi-select filter need.
export function ZiptrripCategoryPicker({ selectedKeys, onChange }: ZiptrripCategoryPickerProps) {
  const [search, setSearch] = useState("");

  const visibleCategories = ZIPTRRIP_CATEGORIES.filter((category) => category.label.toLowerCase().includes(search.toLowerCase()));

  function toggle(key: string): void {
    onChange(selectedKeys.includes(key) ? selectedKeys.filter((selected) => selected !== key) : [...selectedKeys, key]);
  }

  const selectedLabels = ZIPTRRIP_CATEGORIES.filter((category) => selectedKeys.includes(category.key)).map((category) => category.label);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" className="w-full justify-between font-normal">
            <span className="truncate text-left">{selectedLabels.length > 0 ? selectedLabels.join(", ") : "Select Ziptrrip categories"}</span>
            <CaretDownIcon size={16} className="shrink-0" />
          </Button>
        }
      />
      <DropdownMenuContent className="w-(--anchor-width) p-2">
        <div className="relative mb-2">
          <MagnifyingGlassIcon size={14} className="absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Search..."
            className="h-8 pl-7 text-sm"
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {visibleCategories.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No matches.</p>
          ) : (
            visibleCategories.map((category) => (
              <DropdownMenuCheckboxItem
                key={category.key}
                checked={selectedKeys.includes(category.key)}
                onCheckedChange={() => toggle(category.key)}
                closeOnClick={false}
              >
                {category.label}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
