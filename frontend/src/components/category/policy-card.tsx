"use client";

import { useState } from "react";
import { CaretDownIcon, CaretRightIcon, CopyIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CategoryField, CategoryPolicy } from "@/types/category.type";
import { PolicyApprovalFlowsSection } from "./policy-approval-flows-section";
import { PolicyEligibilitySection } from "./policy-eligibility-section";
import { PolicyRulesSection } from "./policy-rules-section";
import type { PolicyKind, PolicyPickerOptions } from "./policy-shared-types";

type PolicyCardProps = {
  policy: CategoryPolicy;
  policyKind: PolicyKind;
  fields: CategoryField[];
  pickerOptions: PolicyPickerOptions;
  onChange: (policy: CategoryPolicy) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function PolicyCard({ policy, policyKind, fields, pickerOptions, onChange, onDuplicate, onDelete }: PolicyCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center gap-2 p-3">
        <button type="button" onClick={() => setIsOpen((open) => !open)} aria-label={isOpen ? "Collapse policy" : "Expand policy"}>
          {isOpen ? <CaretDownIcon size={16} /> : <CaretRightIcon size={16} />}
        </button>
        <Input value={policy.name} onChange={(event) => onChange({ ...policy, name: event.target.value })} className="max-w-xs" />
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Duplicate policy" onClick={onDuplicate}>
            <CopyIcon size={16} />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Delete policy" onClick={onDelete}>
            <TrashIcon size={16} className="text-destructive" />
          </Button>
        </div>
      </div>
      {isOpen ? (
        <div className="space-y-4 border-t border-border p-4">
          <PolicyEligibilitySection policy={policy} policyKind={policyKind} options={pickerOptions} onChange={onChange} />
          <PolicyRulesSection policy={policy} policyKind={policyKind} fields={fields} onChange={onChange} />
          <PolicyApprovalFlowsSection policy={policy} employees={pickerOptions.employees} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}
