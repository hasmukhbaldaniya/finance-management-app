"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
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
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Rules</h4>
      {displayLevels.map((level) => {
        const rulesAtLevel = policy.rules.map((rule, index) => ({ rule, index })).filter(({ rule }) => rule.level === level);
        return (
          <div key={level} className="space-y-2 rounded-md border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground">Level {level}</p>
            {rulesAtLevel.map(({ rule, index }) => (
              <div key={index} className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-2">
                <span className="text-xs font-medium">{rule.ruleType === "field_specific" ? "Field Specific" : "Combination"}</span>
                {rule.ruleType === "field_specific" ? (
                  <>
                    <select
                      value={rule.fieldId ?? ""}
                      onChange={(event) => updateRule(index, { fieldId: Number(event.target.value) })}
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                    >
                      <option value="">Select field…</option>
                      {fieldSpecificOptions.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.fieldName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={rule.operator ?? "equals"}
                      onChange={(event) => updateRule(index, { operator: event.target.value })}
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                    >
                      {OPERATORS.map((operator) => (
                        <option key={operator.value} value={operator.value}>
                          {operator.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={rule.value ?? ""}
                      onChange={(event) => updateRule(index, { value: event.target.value })}
                      placeholder="Value"
                      className="w-32"
                    />
                  </>
                ) : (
                  <>
                    <select
                      value={rule.comparisonFieldId ?? ""}
                      onChange={(event) => updateRule(index, { comparisonFieldId: Number(event.target.value) })}
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                    >
                      <option value="">Select field…</option>
                      {listLikeFields.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.fieldName}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={rule.comparisonValue ?? ""}
                      onChange={(event) => updateRule(index, { comparisonValue: event.target.value })}
                      placeholder="Equals value"
                      className="w-28"
                    />
                    <span className="text-xs text-muted-foreground">then</span>
                    <select
                      value={rule.amountFieldId ?? ""}
                      onChange={(event) => updateRule(index, { amountFieldId: Number(event.target.value) })}
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                    >
                      <option value="">Select field…</option>
                      {numericFields.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.fieldName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={rule.amountOperator ?? "equals"}
                      onChange={(event) => updateRule(index, { amountOperator: event.target.value })}
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                    >
                      {OPERATORS.map((operator) => (
                        <option key={operator.value} value={operator.value}>
                          {operator.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={rule.amountValue ?? ""}
                      onChange={(event) => updateRule(index, { amountValue: event.target.value })}
                      placeholder="Value"
                      className="w-24"
                    />
                  </>
                )}
                <Button type="button" variant="ghost" size="icon" aria-label="Remove rule" onClick={() => removeRule(index)}>
                  <TrashIcon size={14} className="text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => addRule(level, "field_specific")}>
                <PlusIcon size={12} /> Field Specific
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addRule(level, "combination")}>
                <PlusIcon size={12} /> Combination
              </Button>
            </div>
          </div>
        );
      })}
      {canAddLevel ? (
        <Button type="button" variant="outline" size="sm" onClick={addLevel}>
          <PlusIcon size={12} /> Add Level
        </Button>
      ) : null}
    </div>
  );
}
