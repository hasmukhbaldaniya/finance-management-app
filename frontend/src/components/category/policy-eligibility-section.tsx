"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { CategoryEligibilityType, CategoryPolicy } from "@/types/category.type";
import type { PolicyKind, PolicyPickerOptions } from "./policy-shared-types";

type PolicyEligibilitySectionProps = {
  policy: CategoryPolicy;
  policyKind: PolicyKind;
  options: PolicyPickerOptions;
  onChange: (policy: CategoryPolicy) => void;
};

const ELIGIBILITY_TYPES_BY_KIND: Record<PolicyKind, { type: CategoryEligibilityType; label: string }[]> = {
  claim: [
    { type: "department", label: "Department" },
    { type: "grade", label: "Grade" },
    { type: "project", label: "New Project" },
  ],
  exception: [{ type: "employee", label: "Employee List" }],
  project: [{ type: "project", label: "Project List" }],
};

function optionsFor(type: CategoryEligibilityType, options: PolicyPickerOptions): { id: number; label: string }[] {
  switch (type) {
    case "department":
      return options.departments.map((department) => ({ id: department.id, label: department.name }));
    case "grade":
      return options.grades.map((grade) => ({ id: grade.id, label: grade.name }));
    case "project":
      return options.projects.map((project) => ({ id: project.id, label: project.name }));
    case "employee":
      return options.employees.map((employee) => ({ id: employee.id, label: `${employee.firstName} ${employee.lastName}`.trim() }));
  }
}

type MultiEntityPickerProps = {
  options: { id: number; label: string }[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
};

// A real multi-select has no shadcn Select equivalent (it's single-value
// only) — this codebase's own established pattern for exactly this case is
// a DropdownMenuCheckboxItem list (see ziptrrip-category-picker.tsx), not a
// native <select multiple>.
function MultiEntityPicker({ options, selectedIds, onChange }: MultiEntityPickerProps) {
  function toggle(id: number): void {
    onChange(selectedIds.includes(id) ? selectedIds.filter((selected) => selected !== id) : [...selectedIds, id]);
  }

  const selectedLabels = options.filter((option) => selectedIds.includes(option.id)).map((option) => option.label);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" sx={{ width: "100%", justifyContent: "space-between", fontWeight: 400 }}>
            <Box component="span" sx={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
              {selectedLabels.length > 0 ? selectedLabels.join(", ") : "Select…"}
            </Box>
            <Box component="span" sx={{ flexShrink: 0, display: "flex" }}>
              <CaretDownIcon size={16} />
            </Box>
          </Button>
        }
      />
      <DropdownMenuContent matchTriggerWidth sx={{ p: 1 }}>
        <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
          {options.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1.5 }}>
              No options available.
            </Typography>
          ) : (
            options.map((option) => (
              <DropdownMenuCheckboxItem key={option.id} checked={selectedIds.includes(option.id)} onCheckedChange={() => toggle(option.id)} closeOnClick={false}>
                {option.label}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </Box>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PolicyEligibilitySection({ policy, policyKind, options, onChange }: PolicyEligibilitySectionProps) {
  const eligibilityTypes = ELIGIBILITY_TYPES_BY_KIND[policyKind];

  function isChecked(type: CategoryEligibilityType): boolean {
    return policy.eligibility.some((entry) => entry.eligibilityType === type);
  }

  function toggleType(type: CategoryEligibilityType): void {
    if (isChecked(type)) {
      onChange({ ...policy, eligibility: policy.eligibility.filter((entry) => entry.eligibilityType !== type) });
    } else {
      onChange({ ...policy, eligibility: [...policy.eligibility, { eligibilityType: type, entityIds: [] }] });
    }
  }

  function updateEntityIds(type: CategoryEligibilityType, entityIds: number[]): void {
    onChange({ ...policy, eligibility: policy.eligibility.map((entry) => (entry.eligibilityType === type ? { ...entry, entityIds } : entry)) });
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Eligibility
      </Typography>
      <Stack spacing={1.5}>
        {eligibilityTypes.map(({ type, label }) => {
          const entry = policy.eligibility.find((candidate) => candidate.eligibilityType === type);
          return (
            <Stack spacing={0.75} key={type}>
              <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "0.875rem" }}>
                <Checkbox checked={Boolean(entry)} onCheckedChange={() => toggleType(type)} />
                {label}
              </Box>
              {entry ? (
                <MultiEntityPicker options={optionsFor(type, options)} selectedIds={entry.entityIds} onChange={(entityIds) => updateEntityIds(type, entityIds)} />
              ) : null}
            </Stack>
          );
        })}
      </Stack>
      {policy.eligibility.every((entry) => entry.entityIds.length === 0) ? (
        <Typography variant="caption" color="text.secondary">
          At least one value is required.
        </Typography>
      ) : null}
    </Stack>
  );
}
