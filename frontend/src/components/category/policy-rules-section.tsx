"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIST_LIKE_FIELD_TYPES, NUMERIC_FIELD_TYPES } from "@/utils/constants/category.constant";
import type { CategoryField, CategoryPolicy, CategoryPolicyRule } from "@/types/category.type";
import { OPERATORS, type PolicyKind } from "./policy-shared-types";

type PolicyRulesSectionProps = {
  policy: CategoryPolicy;
  policyKind: PolicyKind;
  fields: CategoryField[];
  onChange: (policy: CategoryPolicy) => void;
};

function emptyRule(level: number, ruleType: "field_specific" | "combination"): CategoryPolicyRule {
  return {
    level,
    ruleType,
    fieldId: null,
    operator: "equals",
    value: "",
    comparisonFieldId: null,
    comparisonValue: "",
    amountFieldId: null,
    amountOperator: "equals",
    amountValue: "",
  };
}

// Claim Policies have no fixed maximum level count; Exception/Project
// Policies are capped at exactly one Level — 013's Rules section.
export function PolicyRulesSection({ policy, policyKind, fields, onChange }: PolicyRulesSectionProps) {
  const fieldSpecificOptions = fields.filter((field) => field.addToPolicyRules);
  const listLikeFields = fields.filter((field) => LIST_LIKE_FIELD_TYPES.includes(field.fieldType));
  const numericFields = fields.filter((field) => NUMERIC_FIELD_TYPES.includes(field.fieldType));

  const levels = Array.from(new Set(policy.rules.map((rule) => rule.level))).sort((a, b) => a - b);
  const displayLevels = levels.length > 0 ? levels : [1];
  const canAddLevel = policyKind === "claim";

  function updateRules(rules: CategoryPolicyRule[]): void {
    onChange({ ...policy, rules });
  }

  function addRule(level: number, ruleType: "field_specific" | "combination"): void {
    updateRules([...policy.rules, emptyRule(level, ruleType)]);
  }

  function updateRule(index: number, patch: Partial<CategoryPolicyRule>): void {
    updateRules(policy.rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  }

  function removeRule(index: number): void {
    updateRules(policy.rules.filter((_, i) => i !== index));
  }

  function addLevel(): void {
    const nextLevel = Math.max(0, ...levels) + 1;
    addRule(nextLevel, "field_specific");
  }

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Rules
      </Typography>
      {displayLevels.map((level) => {
        const rulesAtLevel = policy.rules.map((rule, index) => ({ rule, index })).filter(({ rule }) => rule.level === level);
        return (
          <Stack spacing={1} key={level} sx={{ borderRadius: 1.5, border: 1, borderColor: "divider", p: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Level {level}
            </Typography>
            {rulesAtLevel.map(({ rule, index }) => (
              <Stack direction="row" key={index} spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", borderRadius: 1.5, bgcolor: "action.hover", p: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {rule.ruleType === "field_specific" ? "Field Specific" : "Combination"}
                </Typography>
                {rule.ruleType === "field_specific" ? (
                  <>
                    <SelectField
                      value={rule.fieldId?.toString() ?? ""}
                      onValueChange={(value) => updateRule(index, { fieldId: value ? Number(value) : null })}
                      placeholder="Select field…"
                      options={fieldSpecificOptions.map((field) => ({ value: String(field.id), label: field.fieldName }))}
                    />
                    <SelectField
                      value={rule.operator ?? "equals"}
                      onValueChange={(value) => updateRule(index, { operator: value })}
                      options={[...OPERATORS]}
                    />
                    <Input
                      value={rule.value ?? ""}
                      onChange={(event) => updateRule(index, { value: event.target.value })}
                      placeholder="Value"
                      sx={{ width: 128 }}
                    />
                  </>
                ) : (
                  <>
                    <SelectField
                      value={rule.comparisonFieldId?.toString() ?? ""}
                      onValueChange={(value) => updateRule(index, { comparisonFieldId: value ? Number(value) : null })}
                      placeholder="Select field…"
                      options={listLikeFields.map((field) => ({ value: String(field.id), label: field.fieldName }))}
                    />
                    <Input
                      value={rule.comparisonValue ?? ""}
                      onChange={(event) => updateRule(index, { comparisonValue: event.target.value })}
                      placeholder="Equals value"
                      sx={{ width: 112 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      then
                    </Typography>
                    <SelectField
                      value={rule.amountFieldId?.toString() ?? ""}
                      onValueChange={(value) => updateRule(index, { amountFieldId: value ? Number(value) : null })}
                      placeholder="Select field…"
                      options={numericFields.map((field) => ({ value: String(field.id), label: field.fieldName }))}
                    />
                    <SelectField
                      value={rule.amountOperator ?? "equals"}
                      onValueChange={(value) => updateRule(index, { amountOperator: value })}
                      options={[...OPERATORS]}
                    />
                    <Input
                      value={rule.amountValue ?? ""}
                      onChange={(event) => updateRule(index, { amountValue: event.target.value })}
                      placeholder="Value"
                      sx={{ width: 96 }}
                    />
                  </>
                )}
                <Button type="button" variant="ghost" size="icon" aria-label="Remove rule" onClick={() => removeRule(index)}>
                  <Box component="span" sx={{ color: "error.main", display: "flex" }}>
                    <TrashIcon size={14} />
                  </Box>
                </Button>
              </Stack>
            ))}
            <Stack direction="row" spacing={1}>
              <Button type="button" variant="outline" size="sm" onClick={() => addRule(level, "field_specific")}>
                <PlusIcon size={12} /> Field Specific
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addRule(level, "combination")}>
                <PlusIcon size={12} /> Combination
              </Button>
            </Stack>
          </Stack>
        );
      })}
      {canAddLevel ? (
        <Button type="button" variant="outline" size="sm" onClick={addLevel} sx={{ alignSelf: "flex-start" }}>
          <PlusIcon size={12} /> Add Level
        </Button>
      ) : null}
    </Stack>
  );
}
