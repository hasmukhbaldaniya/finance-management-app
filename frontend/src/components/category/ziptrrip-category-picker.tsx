"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
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
          <Button type="button" variant="outline" sx={{ width: "100%", justifyContent: "space-between", fontWeight: 400 }}>
            <Box component="span" sx={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
              {selectedLabels.length > 0 ? selectedLabels.join(", ") : "Select Ziptrrip categories"}
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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Search..."
            sx={{ height: 32, fontSize: "0.875rem" }}
            startAdornment={
              <InputAdornment position="start">
                <MagnifyingGlassIcon size={14} />
              </InputAdornment>
            }
          />
        </Box>
        <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
          {visibleCategories.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1.5 }}>
              No matches.
            </Typography>
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
        </Box>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
