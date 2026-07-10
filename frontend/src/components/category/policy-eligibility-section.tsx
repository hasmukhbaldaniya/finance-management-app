"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
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
          <Button type="button" variant="outline" className="w-full justify-between font-normal">
            <span className="truncate text-left">{selectedLabels.length > 0 ? selectedLabels.join(", ") : "Select…"}</span>
            <CaretDownIcon size={16} className="shrink-0" />
          </Button>
        }
      />
      <DropdownMenuContent className="w-(--anchor-width) p-2">
        <div className="max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No options available.</p>
          ) : (
            options.map((option) => (
              <DropdownMenuCheckboxItem key={option.id} checked={selectedIds.includes(option.id)} onCheckedChange={() => toggle(option.id)} closeOnClick={false}>
                {option.label}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </div>
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
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Eligibility</h4>
      <div className="space-y-3">
        {eligibilityTypes.map(({ type, label }) => {
          const entry = policy.eligibility.find((candidate) => candidate.eligibilityType === type);
          return (
            <div key={type} className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={Boolean(entry)} onChange={() => toggleType(type)} />
                {label}
              </label>
              {entry ? (
                <MultiEntityPicker options={optionsFor(type, options)} selectedIds={entry.entityIds} onChange={(entityIds) => updateEntityIds(type, entityIds)} />
              ) : null}
            </div>
          );
        })}
      </div>
      {policy.eligibility.every((entry) => entry.entityIds.length === 0) ? (
        <p className="text-xs text-muted-foreground">At least one value is required.</p>
      ) : null}
    </div>
  );
}
