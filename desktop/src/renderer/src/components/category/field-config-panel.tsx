"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { SelectField } from "@/components/select-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FileTypesPicker } from "./file-types-picker";
import { OptionsListEditor } from "./options-list-editor";
import {
  CATEGORY_FIELD_TYPE_LABELS,
  CATEGORY_LIST_VALUE_SOURCES,
  DEFAULT_FILE_COUNT,
  DEFAULT_FILE_SIZE_MB,
  MAX_RED_FLAG_DESCRIPTION_LENGTH,
  MAX_TOOLTIP_LENGTH,
  MIN_RED_FLAG_DESCRIPTION_LENGTH,
  MIN_TOOLTIP_LENGTH,
} from "@/utils/constants/category.constant";
import type { CategoryField, CategoryFieldConfig, CategoryFieldRedFlagAction, CategoryFieldRedFlagMode } from "@/types/category.type";

type FieldConfigPanelProps = {
  field: CategoryField;
  allFields: CategoryField[];
  onChange: (patch: Partial<CategoryField>) => void;
};

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
      <Typography variant="body2" sx={{ fontWeight: 400 }}>
        {label}
      </Typography>
      <Switch checked={checked} onCheckedChange={onChange} />
    </Stack>
  );
}

const sectionBorderSx = { borderTop: 1, borderColor: "divider", pt: 2 } as const;
const gridTwoColSx = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 } as const;

export function FieldConfigPanel({ field, allFields, onChange }: FieldConfigPanelProps) {
  function updateConfig(patch: CategoryFieldConfig): void {
    onChange({ config: { ...field.config, ...patch } });
  }

  const dropdownFields = allFields.filter((candidate) => candidate.fieldType === "dropdown" && candidate.id !== field.id);
  const numericFieldNames = allFields
    .filter((candidate) => (candidate.fieldType === "amount" || candidate.fieldType === "number") && candidate.id !== field.id)
    .map((candidate) => candidate.fieldName);
  const dateFieldNames = allFields.filter((candidate) => candidate.fieldType === "date").map((candidate) => candidate.fieldName);

  const conditionalDropdownOptions = field.conditionalVisibility
    ? (allFields.find((candidate) => candidate.id === field.conditionalVisibility!.dependsOnFieldId)?.config.options as string[] | undefined) ?? []
    : [];

  return (
    <Stack spacing={3} sx={{ width: { xs: "100%", md: 384 }, borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "background.paper", p: 2 }}>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Field Type
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {CATEGORY_FIELD_TYPE_LABELS[field.fieldType]}
        </Typography>
      </Box>

      <Stack spacing={1.5}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Basic Details
        </Typography>
        <Stack spacing={1}>
          <Label htmlFor="field-name">Field Name</Label>
          <Input id="field-name" value={field.fieldName} onChange={(event) => onChange({ fieldName: event.target.value })} />
        </Stack>
        <Stack spacing={1}>
          <Label htmlFor="field-tooltip">Tooltip</Label>
          <Input
            id="field-tooltip"
            value={field.tooltip ?? ""}
            onChange={(event) => onChange({ tooltip: event.target.value || null })}
            placeholder={`Optional, ${MIN_TOOLTIP_LENGTH}-${MAX_TOOLTIP_LENGTH} characters`}
          />
        </Stack>
        <ToggleRow label="Required?" checked={field.isRequired} onChange={(checked) => onChange({ isRequired: checked })} />
        <ToggleRow label="Add to Policy Rules" checked={field.addToPolicyRules} onChange={(checked) => onChange({ addToPolicyRules: checked })} />
      </Stack>

      <Stack spacing={1.5} sx={sectionBorderSx}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Conditional Visibility
        </Typography>
        <ToggleRow
          label="Show this field only if…"
          checked={field.conditionalVisibility !== null}
          onChange={(checked) =>
            onChange({
              conditionalVisibility: checked && dropdownFields.length > 0 ? { dependsOnFieldId: dropdownFields[0]!.id, equalsValue: "" } : null,
            })
          }
        />
        {dropdownFields.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            Add at least one Dropdown field to create conditional rules.
          </Typography>
        ) : field.conditionalVisibility ? (
          <Box sx={gridTwoColSx}>
            <SelectField
              value={String(field.conditionalVisibility.dependsOnFieldId)}
              onValueChange={(value) => onChange({ conditionalVisibility: { dependsOnFieldId: Number(value), equalsValue: "" } })}
              options={dropdownFields.map((option) => ({ value: String(option.id), label: option.fieldName }))}
            />
            <SelectField
              value={field.conditionalVisibility.equalsValue}
              onValueChange={(value) =>
                onChange({ conditionalVisibility: { dependsOnFieldId: field.conditionalVisibility!.dependsOnFieldId, equalsValue: value } })
              }
              placeholder="Select value…"
              options={conditionalDropdownOptions.map((option) => ({ value: option, label: option }))}
            />
          </Box>
        ) : null}
      </Stack>

      <Stack spacing={1.5} sx={sectionBorderSx}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Red Flags
        </Typography>
        <Stack direction="row" spacing={2} sx={{ fontSize: "0.875rem", flexWrap: "wrap" }}>
          {(["formula", "ai"] as CategoryFieldRedFlagMode[]).map((mode) => (
            <Box component="label" key={mode} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <input type="radio" name={`redflag-mode-${field.id}`} checked={field.redFlagMode === mode} onChange={() => onChange({ redFlagMode: mode })} />
              {mode === "formula" ? "Formula Based" : "AI Based"}
            </Box>
          ))}
          <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <input
              type="radio"
              name={`redflag-mode-${field.id}`}
              checked={field.redFlagMode === null}
              onChange={() => onChange({ redFlagMode: null, redFlagValue: null, redFlagAction: null })}
            />
            None
          </Box>
        </Stack>

        {field.redFlagMode ? (
          <>
            {field.redFlagMode === "ai" ? (
              <Stack spacing={0.5}>
                <Textarea
                  value={field.redFlagValue ?? ""}
                  onChange={(event) => onChange({ redFlagValue: event.target.value })}
                  rows={3}
                  maxLength={MAX_RED_FLAG_DESCRIPTION_LENGTH}
                  placeholder="Describe your Red Flag…"
                />
                <Typography variant="caption" color="text.secondary">
                  {MIN_RED_FLAG_DESCRIPTION_LENGTH}-{MAX_RED_FLAG_DESCRIPTION_LENGTH} characters.
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={0.5}>
                <Input value={field.redFlagValue ?? ""} onChange={(event) => onChange({ redFlagValue: event.target.value })} placeholder="e.g. {{Amount}} > 5000" />
                <Typography variant="caption" color="text.secondary">
                  Reference fields with <code>{"{{FieldName}}"}</code>. Available:{" "}
                  {[...numericFieldNames, ...dateFieldNames].join(", ") || "none yet"}.
                </Typography>
              </Stack>
            )}
            <Stack direction="row" spacing={2} sx={{ fontSize: "0.875rem" }}>
              {(["highlight", "block"] as CategoryFieldRedFlagAction[]).map((action) => (
                <Box component="label" key={action} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <input
                    type="radio"
                    name={`redflag-action-${field.id}`}
                    checked={field.redFlagAction === action}
                    onChange={() => onChange({ redFlagAction: action })}
                  />
                  {action === "highlight" ? "Highlight" : "Block"}
                </Box>
              ))}
            </Stack>
          </>
        ) : null}
      </Stack>

      <FieldTypeSpecificConfig field={field} updateConfig={updateConfig} onChange={onChange} numericFieldNames={numericFieldNames} dateFieldNames={dateFieldNames} />
    </Stack>
  );
}

type FieldTypeSpecificConfigProps = {
  field: CategoryField;
  updateConfig: (patch: CategoryFieldConfig) => void;
  onChange: (patch: Partial<CategoryField>) => void;
  numericFieldNames: string[];
  dateFieldNames: string[];
};

function FieldTypeSpecificConfig({ field, updateConfig, onChange, numericFieldNames, dateFieldNames }: FieldTypeSpecificConfigProps) {
  const { config } = field;

  switch (field.fieldType) {
    case "invoice":
    case "file_upload":
      return (
        <Stack spacing={1.5} sx={sectionBorderSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            File Settings
          </Typography>
          <Stack spacing={1}>
            <Label>Types of File Allowed</Label>
            <FileTypesPicker
              selected={(config.allowedFileTypes as string[] | undefined) ?? []}
              onChange={(selected) => updateConfig({ allowedFileTypes: selected })}
            />
          </Stack>
          <Stack spacing={1}>
            <Label>Maximum File Size (MB)</Label>
            <Input
              type="number"
              value={(config.maxFileSizeMb as number | undefined) ?? DEFAULT_FILE_SIZE_MB}
              onChange={(event) => updateConfig({ maxFileSizeMb: Number(event.target.value) })}
            />
          </Stack>
          <Stack spacing={1}>
            <Label>Maximum Number of Files</Label>
            <Input
              type="number"
              value={(config.maxFileCount as number | undefined) ?? DEFAULT_FILE_COUNT}
              onChange={(event) => updateConfig({ maxFileCount: Number(event.target.value) })}
            />
          </Stack>
        </Stack>
      );

    case "amount":
    case "number":
      return (
        <Stack spacing={1.5} sx={sectionBorderSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Value Settings
          </Typography>
          <ToggleRow label="Allow Decimal" checked={config.allowDecimal === true} onChange={(checked) => updateConfig({ allowDecimal: checked })} />
          <Box sx={gridTwoColSx}>
            <Stack spacing={1}>
              <Label>Minimum Value</Label>
              <Input type="number" value={(config.minValue as number | string | undefined) ?? ""} onChange={(event) => updateConfig({ minValue: event.target.value === "" ? null : Number(event.target.value) })} />
            </Stack>
            <Stack spacing={1}>
              <Label>Maximum Value</Label>
              <Input type="number" value={(config.maxValue as number | string | undefined) ?? ""} onChange={(event) => updateConfig({ maxValue: event.target.value === "" ? null : Number(event.target.value) })} />
            </Stack>
          </Box>
          <Stack spacing={0.5}>
            <Label>Formula Builder</Label>
            <Input value={(config.formula as string | undefined) ?? ""} onChange={(event) => updateConfig({ formula: event.target.value })} placeholder="e.g. {{Quantity}} * {{Unit Price}}" />
            <Typography variant="caption" color="text.secondary">
              Available fields: {[...numericFieldNames, ...dateFieldNames].length > 0 ? [...numericFieldNames, ...dateFieldNames].join(", ") : "none yet"}.
              Date fields support difference only, e.g. <code>{"{{End Date}} - {{Start Date}}"}</code>.
            </Typography>
          </Stack>
          {field.fieldType === "amount" ? (
            <ToggleRow
              label="Use As Claim Amount"
              checked={config.useAsClaimAmount === true}
              onChange={(checked) => onChange({ config: { ...config, useAsClaimAmount: checked } })}
            />
          ) : null}
        </Stack>
      );

    case "small_text":
      return (
        <Stack spacing={1.5} sx={sectionBorderSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Text Settings
          </Typography>
          <Box sx={gridTwoColSx}>
            <Stack spacing={1}>
              <Label>Minimum Length</Label>
              <Input type="number" value={(config.minLength as number | string | undefined) ?? ""} onChange={(event) => updateConfig({ minLength: event.target.value === "" ? null : Number(event.target.value) })} />
            </Stack>
            <Stack spacing={1}>
              <Label>Maximum Length</Label>
              <Input type="number" value={(config.maxLength as number | string | undefined) ?? ""} onChange={(event) => updateConfig({ maxLength: event.target.value === "" ? null : Number(event.target.value) })} />
            </Stack>
          </Box>
          <ToggleRow label="Allow Special Characters" checked={config.allowSpecialCharacters === true} onChange={(checked) => updateConfig({ allowSpecialCharacters: checked })} />
          <ToggleRow label="Allow Numbers" checked={config.allowNumbers === true} onChange={(checked) => updateConfig({ allowNumbers: checked })} />
          <Stack spacing={0.5}>
            <Label>Regex Validation</Label>
            <Input value={(config.regex as string | undefined) ?? ""} onChange={(event) => updateConfig({ regex: event.target.value })} placeholder="Optional regular expression" />
            <Typography variant="caption" color="text.secondary">
              GST: <code>^[0-9]{"{2}"}[A-Z]{"{5}"}[0-9]{"{4}"}[A-Z]{"{1}"}[1-9A-Z]{"{1}"}Z[0-9A-Z]{"{1}"}$</code> · Email:{" "}
              <code>^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{"{2,}"}$</code> · Phone (India): <code>^[6-9][0-9]{"{9}"}$</code>
            </Typography>
          </Stack>
          {/* Claim Management's useAsInvoiceNumber amendment — optional,
              unlike Use As Claim Amount/Expense Date, so no "exactly one"
              enforcement here; the backend caps it at one per category. */}
          <ToggleRow
            label="Use As Invoice/Bill Number"
            checked={config.useAsInvoiceNumber === true}
            onChange={(checked) => updateConfig({ useAsInvoiceNumber: checked })}
          />
        </Stack>
      );

    case "large_text":
      return (
        <Stack spacing={1.5} sx={sectionBorderSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Text Settings
          </Typography>
          <Box sx={gridTwoColSx}>
            <Stack spacing={1}>
              <Label>Minimum Length</Label>
              <Input type="number" value={(config.minLength as number | string | undefined) ?? ""} onChange={(event) => updateConfig({ minLength: event.target.value === "" ? null : Number(event.target.value) })} />
            </Stack>
            <Stack spacing={1}>
              <Label>Maximum Length</Label>
              <Input type="number" value={(config.maxLength as number | string | undefined) ?? ""} onChange={(event) => updateConfig({ maxLength: event.target.value === "" ? null : Number(event.target.value) })} />
            </Stack>
          </Box>
        </Stack>
      );

    case "list":
      return (
        <Stack spacing={1.5} sx={sectionBorderSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            List Settings
          </Typography>
          <ToggleRow label="Allow Multi-Select" checked={config.allowMultiSelect === true} onChange={(checked) => updateConfig({ allowMultiSelect: checked })} />
          <Stack spacing={1}>
            <Label>Values List</Label>
            <SelectField
              value={(config.valuesListKey as string | undefined) ?? ""}
              onValueChange={(value) => updateConfig({ valuesListKey: value })}
              options={CATEGORY_LIST_VALUE_SOURCES.map((source) => ({ value: source.key, label: source.label }))}
            />
          </Stack>
        </Stack>
      );

    case "city_list":
      return (
        <Stack spacing={1.5} sx={sectionBorderSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            City List Settings
          </Typography>
          <ToggleRow label="Allow Multi-Select" checked={config.allowMultiSelect === true} onChange={(checked) => updateConfig({ allowMultiSelect: checked })} />
          {config.allowMultiSelect === true ? (
            <Box sx={gridTwoColSx}>
              <Stack spacing={1}>
                <Label>Minimum Required Selection</Label>
                <Input
                  type="number"
                  value={(config.minRequiredSelection as number | string | undefined) ?? ""}
                  onChange={(event) => updateConfig({ minRequiredSelection: event.target.value === "" ? null : Number(event.target.value) })}
                />
              </Stack>
              <Stack spacing={1}>
                <Label>Maximum Required Selection</Label>
                {/* No client-side cap — city_list now draws from the real,
                    server-side Country/City catalog (Claim Management's
                    city_list migration) instead of a fixed 10-name list, so
                    the backend's own City.count() check is authoritative
                    here, same as every other unconstrained numeric input in
                    this panel (minValue/maxValue, minLength/maxLength). */}
                <Input
                  type="number"
                  value={(config.maxRequiredSelection as number | string | undefined) ?? ""}
                  onChange={(event) => updateConfig({ maxRequiredSelection: event.target.value === "" ? null : Number(event.target.value) })}
                />
              </Stack>
            </Box>
          ) : null}
        </Stack>
      );

    case "dropdown":
      return (
        <Stack spacing={1.5} sx={sectionBorderSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Dropdown Settings
          </Typography>
          <ToggleRow label="Allow Multi-Select" checked={config.allowMultiSelect === true} onChange={(checked) => updateConfig({ allowMultiSelect: checked })} />
          <Stack spacing={1}>
            <Label>Options</Label>
            <OptionsListEditor options={(config.options as string[] | undefined) ?? []} onChange={(options) => updateConfig({ options })} />
          </Stack>
        </Stack>
      );

    case "radio_button":
      return (
        <Stack spacing={1.5} sx={sectionBorderSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Options
          </Typography>
          <OptionsListEditor options={(config.options as string[] | undefined) ?? []} onChange={(options) => updateConfig({ options })} />
        </Stack>
      );

    case "date":
      return (
        <Stack spacing={1.5} sx={sectionBorderSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Date Settings
          </Typography>
          <ToggleRow label="Allow Past Date" checked={config.allowPastDate === true} onChange={(checked) => updateConfig({ allowPastDate: checked })} />
          <ToggleRow label="Allow Future Date" checked={config.allowFutureDate === true} onChange={(checked) => updateConfig({ allowFutureDate: checked })} />
          <ToggleRow label="Use As Expense Date" checked={config.useAsExpenseDate === true} onChange={(checked) => updateConfig({ useAsExpenseDate: checked })} />
        </Stack>
      );

    case "date_time":
    case "time":
    case "duration":
      return null;
  }
}
