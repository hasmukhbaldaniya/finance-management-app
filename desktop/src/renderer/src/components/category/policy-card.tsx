"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
  // 013's own Validation Rules Summary: Policy Name must be unique within
  // the category (per policy list — Claim/Exception/Project are
  // independent) if provided. The parent already has every sibling name in
  // scope for duplicatePolicy's own auto-suffix logic, so it's cheapest to
  // compute the collision there rather than pass the whole sibling list in.
  hasDuplicateName?: boolean;
};

export function PolicyCard({ policy, policyKind, fields, pickerOptions, onChange, onDuplicate, onDelete, hasDuplicateName }: PolicyCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Box sx={{ borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", p: 1.5 }}>
        <Box component="button" type="button" onClick={() => setIsOpen((open) => !open)} aria-label={isOpen ? "Collapse policy" : "Expand policy"} sx={{ display: "flex", background: "none", border: "none", cursor: "pointer" }}>
          {isOpen ? <CaretDownIcon size={16} /> : <CaretRightIcon size={16} />}
        </Box>
        <Stack spacing={0.5} sx={{ maxWidth: 320 }}>
          <Input value={policy.name} onChange={(event) => onChange({ ...policy, name: event.target.value })} error={hasDuplicateName} />
          {hasDuplicateName ? (
            <Typography variant="caption" color="error">
              A policy with this name already exists.
            </Typography>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ ml: "auto", alignItems: "center" }}>
          <Button type="button" variant="ghost" size="icon" aria-label="Duplicate policy" onClick={onDuplicate}>
            <CopyIcon size={16} />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Delete policy" onClick={onDelete}>
            <Box component="span" sx={{ color: "error.main", display: "flex" }}>
              <TrashIcon size={16} />
            </Box>
          </Button>
        </Stack>
      </Stack>
      {isOpen ? (
        <Stack spacing={2} sx={{ borderTop: 1, borderColor: "divider", p: 2 }}>
          <PolicyEligibilitySection policy={policy} policyKind={policyKind} options={pickerOptions} onChange={onChange} />
          <PolicyRulesSection policy={policy} policyKind={policyKind} fields={fields} onChange={onChange} />
          <PolicyApprovalFlowsSection policy={policy} employees={pickerOptions.employees} onChange={onChange} />
        </Stack>
      ) : null}
    </Box>
  );
}
