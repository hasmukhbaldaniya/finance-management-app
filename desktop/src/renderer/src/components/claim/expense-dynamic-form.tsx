"use client";

import Box from "@mui/material/Box";
import { evaluateFormula } from "@/utils/helpers/formula-evaluator";
import type { CategoryField } from "@/types/category.type";
import { ExpenseFieldRenderer } from "./expense-field-renderer";

type ExpenseDynamicFormProps = {
  fields: CategoryField[];
  fieldValues: Record<string, unknown>;
  onFieldValuesChange: (next: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  // AI review screen only — which field ids still carry an untouched
  // AI-extracted value (023's "Auto-filled" badge, cleared on edit).
  autoFilledFieldIds?: Set<number>;
  onFieldTouched?: (fieldId: number) => void;
};

// Renders a Category's own Step 2 field configuration as this expense's
// form, in configured order, respecting conditionalVisibility — 022's
// central mechanic. Shared identically by the manual expense panel and the
// AI review screen.
export function ExpenseDynamicForm({ fields, fieldValues, onFieldValuesChange, errors, autoFilledFieldIds, onFieldTouched }: ExpenseDynamicFormProps) {
  const orderedFields = [...fields].sort((a, b) => a.position - b.position);

  function isVisible(field: CategoryField): boolean {
    if (!field.conditionalVisibility) return true;
    const dependencyValue = fieldValues[String(field.conditionalVisibility.dependsOnFieldId)];
    return String(dependencyValue ?? "") === field.conditionalVisibility.equalsValue;
  }

  // Non-formula amount/number fields' raw values, keyed by field name — the
  // input a formula-backed sibling field (e.g. "Per Night Rate" from
  // "Number of Nights" * "Rate") recomputes from.
  const numericByName: Record<string, number> = {};
  orderedFields.forEach((field) => {
    if ((field.fieldType === "amount" || field.fieldType === "number") && typeof field.config.formula !== "string") {
      const raw = fieldValues[String(field.id)];
      const num = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
      if (Number.isFinite(num)) numericByName[field.fieldName] = num;
    }
  });

  const visibleFields = orderedFields.filter(isVisible);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
      {visibleFields.map((field) => {
        const hasFormula = (field.fieldType === "amount" || field.fieldType === "number") && typeof field.config.formula === "string" && field.config.formula.trim().length > 0;
        const computedValue = hasFormula ? evaluateFormula((field.config.formula as string).trim(), numericByName) : undefined;
        const spansFullWidth = field.fieldType === "large_text" || field.fieldType === "invoice" || field.fieldType === "file_upload";

        return (
          <Box key={field.id} sx={spansFullWidth ? { gridColumn: { sm: "span 2" } } : undefined}>
            <ExpenseFieldRenderer
              field={field}
              value={fieldValues[String(field.id)]}
              computedValue={computedValue}
              onChange={(value) => {
                onFieldValuesChange({ ...fieldValues, [String(field.id)]: value });
                onFieldTouched?.(field.id);
              }}
              error={errors?.[String(field.id)]}
              isAutoFilled={autoFilledFieldIds?.has(field.id)}
            />
          </Box>
        );
      })}
    </Box>
  );
}
