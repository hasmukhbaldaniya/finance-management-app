import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { getActiveOrganizationId } from "../utils/auth";
import { Category, CategoryField, City, type CategoryFieldType } from "../models";
import {
  ALLOWED_FILE_TYPES,
  CATEGORY_FIELD_TYPES,
  CATEGORY_LIST_VALUE_SOURCES,
  MAX_FIELD_NAME_LENGTH,
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_MB,
  MAX_RED_FLAG_DESCRIPTION_LENGTH,
  MAX_TOOLTIP_LENGTH,
  MIN_FIELD_NAME_LENGTH,
  MIN_FILE_COUNT,
  MIN_FILE_SIZE_MB,
  MIN_RED_FLAG_DESCRIPTION_LENGTH,
  MIN_TOOLTIP_LENGTH,
  SINGLE_INSTANCE_FIELD_TYPES,
} from "../utils/constants/category.constant";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const CATEGORY_NOT_FOUND_MESSAGE = "Category not found.";

const VALID_FIELD_TYPES = new Set<string>(CATEGORY_FIELD_TYPES);
const VALID_LIST_SOURCES = new Set(CATEGORY_LIST_VALUE_SOURCES.map((source) => source.key));
const VALID_FILE_TYPES = new Set<string>(ALLOWED_FILE_TYPES);
const VALID_RED_FLAG_MODES = new Set(["formula", "ai"]);
const VALID_RED_FLAG_ACTIONS = new Set(["highlight", "block"]);

type ConditionalVisibility = { dependsOnFieldId: number; equalsValue: string };

type IncomingField = {
  id?: number;
  fieldType: CategoryFieldType;
  fieldName: string;
  tooltip: string | null;
  isRequired: boolean;
  addToPolicyRules: boolean;
  conditionalVisibility: ConditionalVisibility | null;
  redFlagMode: "formula" | "ai" | null;
  redFlagValue: string | null;
  redFlagAction: "highlight" | "block" | null;
  config: Record<string, unknown>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConditionalVisibility(value: unknown): value is ConditionalVisibility {
  return isPlainObject(value) && typeof value.dependsOnFieldId === "number" && typeof value.equalsValue === "string";
}

function parseIncomingFields(raw: unknown): IncomingField[] | null {
  if (!Array.isArray(raw)) return null;
  const parsed: IncomingField[] = [];
  for (const entry of raw) {
    if (!isPlainObject(entry)) return null;
    const fieldType = typeof entry.fieldType === "string" ? entry.fieldType : "";
    if (!VALID_FIELD_TYPES.has(fieldType)) return null;
    const redFlagMode = typeof entry.redFlagMode === "string" && VALID_RED_FLAG_MODES.has(entry.redFlagMode) ? (entry.redFlagMode as "formula" | "ai") : null;
    const redFlagAction =
      typeof entry.redFlagAction === "string" && VALID_RED_FLAG_ACTIONS.has(entry.redFlagAction) ? (entry.redFlagAction as "highlight" | "block") : null;
    parsed.push({
      id: typeof entry.id === "number" ? entry.id : undefined,
      fieldType: fieldType as CategoryFieldType,
      fieldName: typeof entry.fieldName === "string" ? entry.fieldName.trim() : "",
      tooltip: typeof entry.tooltip === "string" && entry.tooltip.trim() ? entry.tooltip.trim() : null,
      isRequired: entry.isRequired === true,
      addToPolicyRules: entry.addToPolicyRules === true,
      conditionalVisibility: isConditionalVisibility(entry.conditionalVisibility) ? entry.conditionalVisibility : null,
      redFlagMode,
      redFlagValue: typeof entry.redFlagValue === "string" && entry.redFlagValue.trim() ? entry.redFlagValue.trim() : null,
      redFlagAction,
      config: isPlainObject(entry.config) ? entry.config : {},
    });
  }
  return parsed;
}

function extractFormulaReferences(formula: string): string[] {
  const matches = formula.match(/\{\{([^}]+)\}\}/g) ?? [];
  return matches.map((match) => match.slice(2, -2).trim());
}

// Renaming a field auto-updates every formula/red-flag string that
// references it (013's Open Questions) — implemented as a plain string
// substitution pass across this save's incoming formulas, keyed by the old
// name for any field whose id already existed with a different name.
function applyFieldRenames(formula: string, renameMap: Map<string, string>): string {
  return formula.replace(/\{\{([^}]+)\}\}/g, (match, rawName: string) => {
    const newName = renameMap.get(rawName.trim());
    return newName ? `{{${newName}}}` : match;
  });
}

// 013's own Validation Rules: "Date fields support difference only, written
// as {{End Date}} - {{Start Date}}." — a date reference anywhere in a
// formula restricts the *whole* formula to exactly that shape (two date
// fields, one subtraction, nothing else); it can't be mixed with numeric
// fields or any other operator, since "today - {{Start Date}}" or
// "{{Start Date}} + {{Number}}" aren't a duration in the way the spec means.
function isValidFormula(formula: string, numericFieldNames: Set<string>, dateFieldNames: Set<string>): boolean {
  const references = extractFormulaReferences(formula);
  if (references.length === 0) return false;
  if (!references.every((reference) => numericFieldNames.has(reference) || dateFieldNames.has(reference))) return false;

  const usesDateField = references.some((reference) => dateFieldNames.has(reference));
  if (usesDateField) {
    if (references.length !== 2 || !references.every((reference) => dateFieldNames.has(reference))) return false;
    const dateDifferencePattern = /^\{\{[^}]+\}\}\s*-\s*\{\{[^}]+\}\}$/;
    return dateDifferencePattern.test(formula.trim());
  }

  const stripped = formula.replace(/\{\{[^}]+\}\}/g, "0");
  return /^[\d\s+\-*/().]+$/.test(stripped);
}

function isValidRegexPattern(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

function asFiniteNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// Validates one field's Field Specific Configuration against its fieldType
// — see user-stories/013-category-creation.md's per-type settings table.
function validateFieldConfig(field: IncomingField, numericFieldNames: Set<string>, dateFieldNames: Set<string>, cityCount: number): string | null {
  const { config } = field;
  switch (field.fieldType) {
    case "invoice":
    case "file_upload": {
      const allowedFileTypes = config.allowedFileTypes;
      if (!Array.isArray(allowedFileTypes) || allowedFileTypes.length === 0 || !allowedFileTypes.every((type) => typeof type === "string" && VALID_FILE_TYPES.has(type))) {
        return "Select at least one allowed file type.";
      }
      const maxFileSizeMb = asFiniteNumber(config.maxFileSizeMb);
      if (maxFileSizeMb === null || maxFileSizeMb < MIN_FILE_SIZE_MB || maxFileSizeMb > MAX_FILE_SIZE_MB) {
        return `Maximum file size must be between ${MIN_FILE_SIZE_MB} and ${MAX_FILE_SIZE_MB} MB.`;
      }
      const maxFileCount = asFiniteNumber(config.maxFileCount);
      if (maxFileCount === null || maxFileCount < MIN_FILE_COUNT || maxFileCount > MAX_FILE_COUNT) {
        return `Maximum number of files must be between ${MIN_FILE_COUNT} and ${MAX_FILE_COUNT}.`;
      }
      return null;
    }
    case "amount":
    case "number": {
      const minValue = asFiniteNumber(config.minValue);
      const maxValue = asFiniteNumber(config.maxValue);
      if (minValue !== null && maxValue !== null && minValue > maxValue) {
        return "Minimum value cannot be greater than maximum value.";
      }
      if (typeof config.formula === "string" && config.formula.trim()) {
        if (!isValidFormula(config.formula.trim(), numericFieldNames, dateFieldNames)) {
          return "Enter a valid formula using existing Number/Amount fields.";
        }
      }
      return null;
    }
    case "small_text": {
      const minLength = asFiniteNumber(config.minLength);
      const maxLength = asFiniteNumber(config.maxLength);
      if (minLength !== null && maxLength !== null && minLength > maxLength) {
        return "Minimum value cannot be greater than maximum value.";
      }
      if (typeof config.regex === "string" && config.regex.trim() && !isValidRegexPattern(config.regex.trim())) {
        return "Enter a valid regular expression.";
      }
      return null;
    }
    case "large_text": {
      const minLength = asFiniteNumber(config.minLength);
      const maxLength = asFiniteNumber(config.maxLength);
      if (minLength !== null && maxLength !== null && minLength > maxLength) {
        return "Minimum value cannot be greater than maximum value.";
      }
      return null;
    }
    case "list": {
      if (typeof config.valuesListKey !== "string" || !VALID_LIST_SOURCES.has(config.valuesListKey)) {
        return "Select a values list.";
      }
      return null;
    }
    case "city_list": {
      if (config.allowMultiSelect === true) {
        const minRequired = asFiniteNumber(config.minRequiredSelection);
        const maxRequired = asFiniteNumber(config.maxRequiredSelection);
        if (minRequired === null || maxRequired === null) {
          return "Enter minimum and maximum required selection.";
        }
        if (minRequired > maxRequired) return "Minimum value cannot be greater than maximum value.";
        if (maxRequired > cityCount) return "Maximum required selection exceeds the available cities.";
      }
      return null;
    }
    case "dropdown":
    case "radio_button": {
      const options = config.options;
      if (!Array.isArray(options) || options.length < 2) return "Add at least two options.";
      const trimmed = options.map((option) => (typeof option === "string" ? option.trim() : ""));
      if (trimmed.some((option) => !option)) return "Add at least two options.";
      if (new Set(trimmed.map((option) => option.toLowerCase())).size !== trimmed.length) {
        return "Each option must be unique.";
      }
      return null;
    }
    case "date":
    case "date_time":
    case "time":
    case "duration":
      return null;
  }
}

export async function saveCategoryFields(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const category = await Category.findOne({ where: { id: Number(req.params.id), organizationId } });
  if (!category) {
    res.status(404).json({ error: CATEGORY_NOT_FOUND_MESSAGE });
    return;
  }

  const isDraftSave = req.body?.isDraftSave === true;
  const incoming = parseIncomingFields(req.body?.fields);
  if (!incoming) {
    res.status(400).json({ error: "Unknown field type." });
    return;
  }

  const existingFields = await CategoryField.findAll({ where: { categoryId: category.id } });
  const existingById = new Map(existingFields.map((field) => [field.id, field]));

  // Rename cascade: apply before validation so a renamed field's own
  // formula references (and every other field's) reflect the new name.
  const renameMap = new Map<string, string>();
  incoming.forEach((field) => {
    if (field.id === undefined) return;
    const existing = existingById.get(field.id);
    if (existing && existing.fieldName !== field.fieldName && field.fieldName) {
      renameMap.set(existing.fieldName, field.fieldName);
    }
  });
  if (renameMap.size > 0) {
    incoming.forEach((field) => {
      if (typeof field.config.formula === "string") {
        field.config.formula = applyFieldRenames(field.config.formula, renameMap);
      }
      if (field.redFlagMode === "formula" && field.redFlagValue) {
        field.redFlagValue = applyFieldRenames(field.redFlagValue, renameMap);
      }
    });
  }

  if (!isDraftSave) {
    // Built here (rather than only down near validateFieldConfig's own use
    // of them) so the Red Flag "Formula Based" check below can reuse them.
    const numericFieldNames = new Set(incoming.filter((field) => field.fieldType === "amount" || field.fieldType === "number").map((field) => field.fieldName));
    const dateFieldNames = new Set(incoming.filter((field) => field.fieldType === "date").map((field) => field.fieldName));

    const seenNames = new Set<string>();
    for (const field of incoming) {
      if (field.fieldName.length < MIN_FIELD_NAME_LENGTH || field.fieldName.length > MAX_FIELD_NAME_LENGTH) {
        res.status(400).json({ error: "Field Name is required." });
        return;
      }
      const lowerName = field.fieldName.toLowerCase();
      if (seenNames.has(lowerName)) {
        res.status(400).json({ error: "A field with this name already exists in this form." });
        return;
      }
      seenNames.add(lowerName);

      if (field.tooltip && (field.tooltip.length < MIN_TOOLTIP_LENGTH || field.tooltip.length > MAX_TOOLTIP_LENGTH)) {
        res.status(400).json({ error: `Tooltip must be between ${MIN_TOOLTIP_LENGTH} and ${MAX_TOOLTIP_LENGTH} characters.` });
        return;
      }
      if (field.redFlagMode === "ai" && field.redFlagValue) {
        if (field.redFlagValue.length < MIN_RED_FLAG_DESCRIPTION_LENGTH || field.redFlagValue.length > MAX_RED_FLAG_DESCRIPTION_LENGTH) {
          res.status(400).json({
            error: `Red flag description must be between ${MIN_RED_FLAG_DESCRIPTION_LENGTH} and ${MAX_RED_FLAG_DESCRIPTION_LENGTH} characters.`,
          });
          return;
        }
      }
      // 013's own Red Flags spec: Formula Based mode uses "the same
      // {{FieldName}} ... mechanic" as the Amount/Number Formula Builder —
      // previously only "ai" mode was validated here, so any string (even
      // one referencing nonexistent fields) was silently accepted.
      if (field.redFlagMode === "formula" && field.redFlagValue) {
        if (!isValidFormula(field.redFlagValue.trim(), numericFieldNames, dateFieldNames)) {
          res.status(400).json({ error: "Enter a valid formula using existing Number/Amount fields." });
          return;
        }
      }
    }

    for (const type of SINGLE_INSTANCE_FIELD_TYPES) {
      const count = incoming.filter((field) => field.fieldType === type).length;
      if (count > 1) {
        res.status(400).json({ error: `Only one ${type.replace("_", " ")} field is allowed.` });
        return;
      }
    }

    // Only queried when a city_list field is actually present — every other
    // save skips this round-trip entirely.
    const cityCount = incoming.some((field) => field.fieldType === "city_list") ? await City.count() : 0;

    for (const field of incoming) {
      const error = validateFieldConfig(field, numericFieldNames, dateFieldNames, cityCount);
      if (error) {
        res.status(400).json({ error });
        return;
      }
    }

    const dateFields = incoming.filter((field) => field.fieldType === "date");
    if (dateFields.length === 0) {
      res.status(400).json({ error: "At least one Date field is required." });
      return;
    }
    if (dateFields.filter((field) => field.config.useAsExpenseDate === true).length !== 1) {
      res.status(400).json({ error: "Select one Date field to use as the expense date." });
      return;
    }
    const amountFields = incoming.filter((field) => field.fieldType === "amount");
    if (amountFields.length === 0) {
      res.status(400).json({ error: "At least one Amount field is required." });
      return;
    }
    if (amountFields.filter((field) => field.config.useAsClaimAmount === true).length !== 1) {
      res.status(400).json({ error: "At least one field must be selected as Claim Amount." });
      return;
    }
    // useAsInvoiceNumber (022's amendment) is optional, unlike Amount/Date
    // above — a category with no invoice-number concept (mileage, per-diem)
    // simply never sets it, so only an upper bound of one is enforced here.
    if (incoming.filter((field) => field.config.useAsInvoiceNumber === true).length > 1) {
      res.status(400).json({ error: "Only one field can be marked as the invoice/bill number." });
      return;
    }
  }

  // Replace-by-id, not destroy-then-recreate — CategoryField ids are
  // referenced by CategoryPolicyRule and other fields' conditionalVisibility,
  // and must stay stable across saves (see 013's Open Questions on renames).
  const incomingIds = new Set(incoming.filter((field) => field.id !== undefined).map((field) => field.id as number));
  const idsToDelete = existingFields.filter((field) => !incomingIds.has(field.id)).map((field) => field.id);

  // Every existing field is either kept (present in `incoming`, possibly
  // updated) or removed (in idsToDelete) — no third case — so clearing
  // dangling Conditional Visibility references only needs to look at
  // `incoming` itself, not a fresh DB query.
  if (idsToDelete.length > 0) {
    await CategoryField.destroy({ where: { id: idsToDelete } });
    incoming.forEach((field) => {
      if (field.conditionalVisibility && idsToDelete.includes(field.conditionalVisibility.dependsOnFieldId)) {
        field.conditionalVisibility = null;
      }
    });
  }

  // A brand-new field's Conditional Visibility can target another brand-new
  // field added in this same sitting (013's own Flow treats "exists in the
  // form" as local UI state, not persisted state) — neither has a real id
  // yet when the request is built. The frontend sends a negative, request-
  // scoped sentinel as `id` for such new fields so cross-references between
  // two new fields can be expressed; `tempIdToRealId` resolves those
  // sentinels to real ids once every field in this save has been persisted.
  const tempIdToRealId = new Map<number, number>();
  const savedRecords: { record: CategoryField; intendedVisibility: ConditionalVisibility | null }[] = [];

  let position = 0;
  for (const field of incoming) {
    const payload = {
      fieldType: field.fieldType,
      fieldName: field.fieldName,
      tooltip: field.tooltip,
      isRequired: field.isRequired,
      addToPolicyRules: field.addToPolicyRules,
      position: position++,
      config: field.config,
      conditionalVisibility: null,
      redFlagMode: field.redFlagMode,
      redFlagValue: field.redFlagValue,
      redFlagAction: field.redFlagAction,
    };
    const existing = field.id !== undefined ? existingById.get(field.id) : undefined;
    let record: CategoryField;
    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      record = existing;
    } else {
      record = await CategoryField.create({ categoryId: category.id, ...payload });
      if (field.id !== undefined) {
        tempIdToRealId.set(field.id, record.id);
      }
    }
    savedRecords.push({ record, intendedVisibility: field.conditionalVisibility });
  }

  for (const { record, intendedVisibility } of savedRecords) {
    if (!intendedVisibility) continue;
    const targetId = tempIdToRealId.get(intendedVisibility.dependsOnFieldId) ?? intendedVisibility.dependsOnFieldId;
    const targetExists = savedRecords.some((entry) => entry.record.id === targetId);
    record.conditionalVisibility = targetExists ? { dependsOnFieldId: targetId, equalsValue: intendedVisibility.equalsValue } : null;
    await record.save();
  }

  category.updatedBy = req.userId;
  await category.save();

  res.status(200).json({ message: "Expense form saved." });
}
