"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { toast } from "@/components/ui/toast";
import { getCategoryDetail, saveCategoryFields } from "@/apis/category";
import { useCategoryWizard } from "@/contexts/CategoryWizardContext";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { CATEGORY_STEP_SEGMENTS, DEFAULT_FILE_COUNT, DEFAULT_FILE_SIZE_MB, SINGLE_INSTANCE_FIELD_TYPES } from "@/utils/constants/category.constant";
import { ROUTES } from "@/utils/constants/route.constant";
import type { CategoryField, CategoryFieldConfig, CategoryFieldType } from "@/types/category.type";
import { DeleteFieldDialog } from "./delete-field-dialog";
import { FieldConfigPanel } from "./field-config-panel";
import { FieldLibrary } from "./field-library";
import { FieldList } from "./field-list";
import { WizardFooter } from "./wizard-footer";

function defaultConfigFor(fieldType: CategoryFieldType): CategoryFieldConfig {
  if (fieldType === "invoice" || fieldType === "file_upload") {
    return { allowedFileTypes: [], maxFileSizeMb: DEFAULT_FILE_SIZE_MB, maxFileCount: DEFAULT_FILE_COUNT };
  }
  return {};
}

function suggestFieldName(existingNames: Set<string>): string {
  if (!existingNames.has("new field")) return "New Field";
  let index = 1;
  while (existingNames.has(`new field${index}`)) index++;
  return `New Field${index}`;
}

type ExpenseFormBuilderProps = {
  categoryId: number;
};

export function ExpenseFormBuilder({ categoryId }: ExpenseFormBuilderProps) {
  const router = useRouter();
  const wizard = useCategoryWizard();
  const fields = wizard.fields;

  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(fields[0]?.id ?? null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingContinue, setIsSavingContinue] = useState(false);
  const nextTempId = useRef(-1);

  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null;
  const disabledTypes = new Set(SINGLE_INSTANCE_FIELD_TYPES.filter((type) => fields.some((field) => field.fieldType === type)));
  const showSaveAsDraft = wizard.status !== "active";

  function addField(fieldType: CategoryFieldType): void {
    const tempId = nextTempId.current--;
    const existingNames = new Set(fields.map((field) => field.fieldName.toLowerCase()));
    const newField: CategoryField = {
      id: tempId,
      fieldType,
      fieldName: suggestFieldName(existingNames),
      tooltip: null,
      isRequired: false,
      addToPolicyRules: false,
      position: fields.length,
      config: defaultConfigFor(fieldType),
      conditionalVisibility: null,
      redFlagMode: null,
      redFlagValue: null,
      redFlagAction: null,
    };
    wizard.setFields([...fields, newField]);
    setSelectedFieldId(tempId);
  }

  function handleFieldChange(patch: Partial<CategoryField>): void {
    if (!selectedField) return;
    let nextFields = fields.map((field) => (field.id === selectedField.id ? { ...field, ...patch } : field));

    // Use As Claim Amount / Use As Expense Date are single-select across the
    // whole form — turning one on auto-unmarks whichever field had it before.
    if (patch.config?.useAsClaimAmount === true) {
      nextFields = nextFields.map((field) =>
        field.id !== selectedField.id && field.fieldType === "amount" ? { ...field, config: { ...field.config, useAsClaimAmount: false } } : field
      );
    }
    if (patch.config?.useAsExpenseDate === true) {
      nextFields = nextFields.map((field) =>
        field.id !== selectedField.id && field.fieldType === "date" ? { ...field, config: { ...field.config, useAsExpenseDate: false } } : field
      );
    }

    wizard.setFields(nextFields);
  }

  function moveField(fieldId: number, direction: "up" | "down"): void {
    const index = fields.findIndex((field) => field.id === fieldId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= fields.length) return;
    const next = [...fields];
    [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
    wizard.setFields(next);
  }

  function dependentsOf(fieldId: number): string[] {
    const target = fields.find((field) => field.id === fieldId);
    if (!target) return [];
    const dependents = new Set<string>();
    const reference = `{{${target.fieldName}}}`;
    fields.forEach((field) => {
      if (field.id === fieldId) return;
      if (field.conditionalVisibility?.dependsOnFieldId === fieldId) dependents.add(field.fieldName);
      const formula = typeof field.config.formula === "string" ? field.config.formula : "";
      const redFlagFormula = field.redFlagMode === "formula" && field.redFlagValue ? field.redFlagValue : "";
      if (formula.includes(reference) || redFlagFormula.includes(reference)) dependents.add(field.fieldName);
    });
    return Array.from(dependents);
  }

  function confirmDelete(): void {
    if (pendingDeleteId === null) return;
    const deletedId = pendingDeleteId;
    const next = fields
      .filter((field) => field.id !== deletedId)
      .map((field) =>
        field.conditionalVisibility?.dependsOnFieldId === deletedId ? { ...field, conditionalVisibility: null } : field
      );
    wizard.setFields(next);
    if (selectedFieldId === deletedId) setSelectedFieldId(next[0]?.id ?? null);
    setPendingDeleteId(null);
  }

  function computeFormLevelErrors(): string[] {
    const errors: string[] = [];
    const dateFields = fields.filter((field) => field.fieldType === "date");
    const amountFields = fields.filter((field) => field.fieldType === "amount");
    if (dateFields.length === 0) {
      errors.push("At least one Date field is required.");
    } else if (dateFields.filter((field) => field.config.useAsExpenseDate === true).length !== 1) {
      errors.push("Select one Date field to use as the expense date.");
    }
    if (amountFields.length === 0) {
      errors.push("At least one Amount field is required.");
    } else if (amountFields.filter((field) => field.config.useAsClaimAmount === true).length !== 1) {
      errors.push("At least one field must be selected as Claim Amount.");
    }
    return errors;
  }

  async function persist(isDraftSave: boolean): Promise<void> {
    await saveCategoryFields(categoryId, { isDraftSave, fields });
    // Refetch so temp negative ids (assigned to fields added this session)
    // are replaced by their real database ids before any further edits.
    const detail = await getCategoryDetail(categoryId);
    wizard.setFields(detail.category.fields);
  }

  async function handleSaveAsDraft(): Promise<void> {
    setIsSavingDraft(true);
    try {
      await persist(true);
      toast.success("Category saved as draft.");
      router.push(ROUTES.COMPANY_SETTINGS.CATEGORIES);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSaveAndContinue(): Promise<void> {
    const errors = computeFormLevelErrors();
    setFormErrors(errors);
    if (errors.length > 0) return;

    setIsSavingContinue(true);
    try {
      await persist(false);
      wizard.markStepReached(2);
      router.push(ROUTES.categoryStep(categoryId, CATEGORY_STEP_SEGMENTS.policiesAndApprovals));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE;
      setFormErrors([message]);
    } finally {
      setIsSavingContinue(false);
    }
  }

  const pendingDeleteField = fields.find((field) => field.id === pendingDeleteId) ?? null;

  return (
    <Stack spacing={2}>
      {formErrors.length > 0 ? (
        <Stack spacing={0.5} sx={{ borderRadius: 2, border: 1, borderColor: "error.light", bgcolor: (theme) => alpha(theme.palette.error.main, 0.05), p: 1.5 }}>
          {formErrors.map((error) => (
            <Typography key={error} variant="body2" color="error">
              {error}
            </Typography>
          ))}
        </Stack>
      ) : null}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <FieldLibrary disabledTypes={disabledTypes} onAdd={addField} />
        <FieldList fields={fields} selectedFieldId={selectedFieldId} onSelect={setSelectedFieldId} onMove={moveField} onDelete={setPendingDeleteId} />
        {selectedField ? <FieldConfigPanel field={selectedField} allFields={fields} onChange={handleFieldChange} /> : null}
      </Stack>

      <WizardFooter
        showSaveAsDraft={showSaveAsDraft}
        primaryLabel="Save & Continue"
        isSavingDraft={isSavingDraft}
        isSavingPrimary={isSavingContinue}
        onSaveAsDraft={handleSaveAsDraft}
        onPrimary={handleSaveAndContinue}
      />

      <DeleteFieldDialog
        fieldName={pendingDeleteField?.fieldName ?? null}
        dependents={pendingDeleteId !== null ? dependentsOf(pendingDeleteId) : []}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </Stack>
  );
}
