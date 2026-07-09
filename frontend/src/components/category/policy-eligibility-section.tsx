"use client";

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
                <select
                  multiple
                  value={entry.entityIds.map(String)}
                  onChange={(event) => updateEntityIds(type, Array.from(event.target.selectedOptions).map((option) => Number(option.value)))}
                  className="h-24 w-full rounded-lg border border-input bg-transparent px-2 py-1 text-sm"
                >
                  {optionsFor(type, options).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
