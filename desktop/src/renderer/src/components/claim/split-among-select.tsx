"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import { CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getEmployees } from "@/apis/employee";
import type { EmployeeListItem } from "@/types/employee.type";

const SEARCH_DEBOUNCE_MS = 250;
const VISIBLE_CHIP_LIMIT = 2;

type SplitAmongSelectProps = {
  requesterId: number;
  requesterName: string;
  selectedColleagues: EmployeeListItem[];
  onChange: (colleagues: EmployeeListItem[]) => void;
  maxColleagues: number;
};

// 027's "Split Among" picker — a multi-select of same-organization
// colleagues, built on this codebase's own established DropdownMenu +
// DropdownMenuCheckboxItem multi-select shape (see frontend/CLAUDE.md) rather
// than MUI's Autocomplete, since the requester's own chip needs to render
// without a delete affordance while every other chip has one — a per-item
// distinction MUI's newer `slotProps.chip` API doesn't support cleanly.
export function SplitAmongSelect({ requesterId, requesterName, selectedColleagues, onChange, maxColleagues }: SplitAmongSelectProps) {
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<EmployeeListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsSearching(true);
      getEmployees({ name: search, status: ["active"], pageSize: 20 })
        .then((response) => setCandidates(response.employees.filter((employee) => employee.id !== requesterId)))
        .catch(() => setCandidates([]))
        .finally(() => setIsSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search, requesterId]);

  const isSelected = (employeeId: number) => selectedColleagues.some((employee) => employee.id === employeeId);

  function toggle(employee: EmployeeListItem): void {
    if (isSelected(employee.id)) {
      onChange(selectedColleagues.filter((existing) => existing.id !== employee.id));
      return;
    }
    if (selectedColleagues.length >= maxColleagues) {
      toast.error(`You can split with up to ${maxColleagues} colleagues.`);
      return;
    }
    onChange([...selectedColleagues, employee]);
  }

  const visibleChips = selectedColleagues.slice(0, VISIBLE_CHIP_LIMIT);
  const overflowCount = selectedColleagues.length - visibleChips.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" sx={{ width: "100%", justifyContent: "space-between", fontWeight: 400, minHeight: 40 }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap", minWidth: 0, flex: 1, py: 0.5 }}>
              <Chip label={`${requesterName} (You)`} size="small" />
              {visibleChips.map((employee) => (
                <Chip key={employee.id} label={`${employee.firstName} ${employee.lastName}`.trim()} size="small" />
              ))}
              {overflowCount > 0 ? <Chip label={`+${overflowCount}`} size="small" /> : null}
            </Stack>
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
            placeholder="Search"
            sx={{ height: 32, fontSize: "0.875rem" }}
            startAdornment={
              <InputAdornment position="start">
                <MagnifyingGlassIcon size={14} />
              </InputAdornment>
            }
          />
        </Box>
        <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
          <DropdownMenuCheckboxItem checked disabled closeOnClick={false}>
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                {requesterName} (You)
              </Typography>
            </Stack>
          </DropdownMenuCheckboxItem>
          {isSearching ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
              Searching…
            </Typography>
          ) : candidates.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
              No colleagues found.
            </Typography>
          ) : (
            candidates.map((employee) => (
              <DropdownMenuCheckboxItem
                key={employee.id}
                checked={isSelected(employee.id)}
                onCheckedChange={() => toggle(employee)}
                closeOnClick={false}
              >
                <Stack sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                    {employee.firstName} {employee.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {employee.email}
                  </Typography>
                </Stack>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </Box>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
