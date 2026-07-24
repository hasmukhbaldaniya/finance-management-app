import { City, type CategoryField } from "../models";
import { getValidAirlineIds } from "../services/auth.service";
import { evaluateFormula } from "./formula-evaluator";

// A Claim's expense form is not fixed — it's whatever the selected
// Category's own Step 2 field configuration says it should be (022's
// Overview). This module re-validates submitted field values against that
// same CategoryField[] configuration at claim-submission time, the same way
// category-fields.controller.ts's validateFieldConfig validates it at
// category-configuration time — two different moments, one shared source of
// truth (the CategoryField row itself).

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function isFieldVisible(field: CategoryField, valuesByFieldId: Map<number, unknown>): boolean {
  if (!field.conditionalVisibility) return true;
  const dependencyValue = valuesByFieldId.get(field.conditionalVisibility.dependsOnFieldId);
  return String(dependencyValue ?? "") === field.conditionalVisibility.equalsValue;
}

export type ExpenseFieldValidationSuccess = {
  amount: string;
  expenseDate: string | null;
  invoiceNumber: string | null;
  normalizedValues: Record<string, unknown>;
};

export type ExpenseFieldValidationResult = { error: string } | ExpenseFieldValidationSuccess;

// `isDraftSave` mirrors Category Creation's own lenient-draft posture (013) —
// a half-filled expense is a valid draft; every required-field/type rule is
// enforced only when saving for real (Save Claim / final AI review save).
export async function validateExpenseFieldValues(
  categoryFields: CategoryField[],
  fieldValues: unknown,
  isDraftSave: boolean
): Promise<ExpenseFieldValidationResult> {
  const raw = isPlainObject(fieldValues) ? fieldValues : {};
  const valuesByFieldId = new Map<number, unknown>(categoryFields.map((field) => [field.id, raw[String(field.id)]]));
  const normalizedValues: Record<string, unknown> = {};

  const orderedFields = [...categoryFields].sort((a, b) => a.position - b.position);
  const visibleFields = orderedFields.filter((field) => isFieldVisible(field, valuesByFieldId));

  // Formula-backed amount/number fields are computed from every other
  // field's raw numeric value, by field name (013's own formula grammar
  // references fields by name, not id) — computed before per-field
  // validation so the recomputed value is what gets range/required-checked.
  const numericByName = new Map<string, number>();
  visibleFields.forEach((field) => {
    if ((field.fieldType === "amount" || field.fieldType === "number") && typeof field.config.formula !== "string") {
      const num = asFiniteNumber(valuesByFieldId.get(field.id));
      if (num !== null) numericByName.set(field.fieldName, num);
    }
  });

  let cityCache: Map<number, City> | null = null;
  async function citiesById(ids: number[]): Promise<Map<number, City>> {
    if (!cityCache) cityCache = new Map();
    const missing = ids.filter((id) => !cityCache!.has(id));
    if (missing.length > 0) {
      const rows = await City.findAll({ where: { id: missing } });
      rows.forEach((row) => cityCache!.set(row.id, row));
    }
    return cityCache;
  }

  async function validAirlineIds(): Promise<Set<number>> {
    return getValidAirlineIds();
  }

  for (const field of visibleFields) {
    const config = field.config;
    const rawValue = valuesByFieldId.get(field.id);
    const hasValue = rawValue !== null && rawValue !== undefined && rawValue !== "" && !(Array.isArray(rawValue) && rawValue.length === 0);

    switch (field.fieldType) {
      case "invoice":
      case "file_upload": {
        const files = Array.isArray(rawValue) ? rawValue : [];
        if (field.isRequired && !isDraftSave && files.length === 0) {
          return { error: `${field.fieldName} is required.` };
        }
        const maxFileCount = asFiniteNumber(config.maxFileCount);
        if (maxFileCount !== null && files.length > maxFileCount) {
          return { error: `${field.fieldName} allows at most ${maxFileCount} file(s).` };
        }
        normalizedValues[field.id] = files;
        break;
      }
      case "amount":
      case "number": {
        if (typeof config.formula === "string" && config.formula.trim()) {
          const computed = evaluateFormula(config.formula.trim(), Object.fromEntries(numericByName));
          normalizedValues[field.id] = computed;
          break;
        }
        const num = asFiniteNumber(rawValue);
        if (field.isRequired && !isDraftSave && num === null) {
          return { error: `${field.fieldName} is required.` };
        }
        if (num !== null) {
          const minValue = asFiniteNumber(config.minValue);
          const maxValue = asFiniteNumber(config.maxValue);
          if (minValue !== null && num < minValue) return { error: `${field.fieldName} must be at least ${minValue}.` };
          if (maxValue !== null && num > maxValue) return { error: `${field.fieldName} must be at most ${maxValue}.` };
        }
        normalizedValues[field.id] = num;
        break;
      }
      case "small_text":
      case "large_text": {
        const text = typeof rawValue === "string" ? rawValue.trim() : "";
        if (field.isRequired && !isDraftSave && !text) {
          return { error: `${field.fieldName} is required.` };
        }
        if (text) {
          const minLength = asFiniteNumber(config.minLength);
          const maxLength = asFiniteNumber(config.maxLength);
          if (minLength !== null && text.length < minLength) return { error: `${field.fieldName} must be at least ${minLength} characters.` };
          if (maxLength !== null && text.length > maxLength) return { error: `${field.fieldName} must be at most ${maxLength} characters.` };
          if (field.fieldType === "small_text" && typeof config.regex === "string" && config.regex.trim()) {
            try {
              if (!new RegExp(config.regex.trim()).test(text)) return { error: `${field.fieldName} is not in a valid format.` };
            } catch {
              // An invalid regex was already rejected at category-configuration
              // time — nothing to enforce here if one somehow slipped through.
            }
          }
        }
        normalizedValues[field.id] = text || null;
        break;
      }
      case "list": {
        const value = rawValue;
        if (field.isRequired && !isDraftSave && !hasValue) {
          return { error: `${field.fieldName} is required.` };
        }
        if (hasValue && config.valuesListKey === "airlines") {
          const ids = await validAirlineIds();
          if (!ids.has(Number(value))) return { error: `Select a valid ${field.fieldName}.` };
        }
        normalizedValues[field.id] = value ?? null;
        break;
      }
      case "city_list": {
        const allowMulti = config.allowMultiSelect === true;
        const ids = (allowMulti ? (Array.isArray(rawValue) ? rawValue : []) : rawValue !== undefined && rawValue !== null ? [rawValue] : [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id));
        if (field.isRequired && !isDraftSave && ids.length === 0) {
          return { error: `${field.fieldName} is required.` };
        }
        if (ids.length > 0) {
          const cities = await citiesById(ids);
          if (!ids.every((id) => cities.has(id))) return { error: `Select a valid ${field.fieldName}.` };
          if (allowMulti) {
            const minRequired = asFiniteNumber(config.minRequiredSelection);
            const maxRequired = asFiniteNumber(config.maxRequiredSelection);
            if (minRequired !== null && ids.length < minRequired) return { error: `Select at least ${minRequired} for ${field.fieldName}.` };
            if (maxRequired !== null && ids.length > maxRequired) return { error: `Select at most ${maxRequired} for ${field.fieldName}.` };
          }
        }
        normalizedValues[field.id] = allowMulti ? ids : (ids[0] ?? null);
        break;
      }
      case "dropdown":
      case "radio_button": {
        const options = Array.isArray(config.options) ? config.options.filter((option): option is string => typeof option === "string") : [];
        if (field.isRequired && !isDraftSave && !hasValue) {
          return { error: `${field.fieldName} is required.` };
        }
        if (hasValue && !options.includes(String(rawValue))) {
          return { error: `Select a valid ${field.fieldName}.` };
        }
        normalizedValues[field.id] = rawValue ?? null;
        break;
      }
      case "date":
      case "date_time": {
        const date = typeof rawValue === "string" || typeof rawValue === "number" ? new Date(rawValue) : null;
        const isValidDate = date !== null && !Number.isNaN(date.getTime());
        if (field.isRequired && !isDraftSave && !isValidDate) {
          return { error: `${field.fieldName} is required.` };
        }
        normalizedValues[field.id] = isValidDate ? (date as Date).toISOString() : null;
        break;
      }
      case "time":
      case "duration": {
        if (field.isRequired && !isDraftSave && !hasValue) {
          return { error: `${field.fieldName} is required.` };
        }
        normalizedValues[field.id] = hasValue ? rawValue : null;
        break;
      }
    }
  }

  const amountField = categoryFields.find((field) => field.fieldType === "amount" && field.config.useAsClaimAmount === true);
  const dateField = categoryFields.find((field) => field.fieldType === "date" && field.config.useAsExpenseDate === true);
  const invoiceField = categoryFields.find((field) => field.config.useAsInvoiceNumber === true);

  const amountValue = amountField ? asFiniteNumber(normalizedValues[amountField.id]) : null;
  const dateValue = dateField && typeof normalizedValues[dateField.id] === "string" ? (normalizedValues[dateField.id] as string) : null;
  const invoiceValue = invoiceField && typeof normalizedValues[invoiceField.id] === "string" ? (normalizedValues[invoiceField.id] as string) : null;

  return {
    amount: (amountValue ?? 0).toFixed(2),
    expenseDate: dateValue ? dateValue.slice(0, 10) : null,
    invoiceNumber: invoiceValue,
    normalizedValues,
  };
}
