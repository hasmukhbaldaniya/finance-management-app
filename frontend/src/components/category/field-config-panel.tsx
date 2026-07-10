"use client";

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
    <div className="flex items-center justify-between gap-4">
      <Label className="font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

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
    <div className="w-full space-y-6 rounded-lg border border-border bg-background p-4 md:w-96">
      <div>
        <p className="text-xs text-muted-foreground">Field Type</p>
        <p className="text-sm font-semibold">{CATEGORY_FIELD_TYPE_LABELS[field.fieldType]}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Basic Details</h3>
        <div className="space-y-2">
          <Label htmlFor="field-name">Field Name</Label>
          <Input id="field-name" value={field.fieldName} onChange={(event) => onChange({ fieldName: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="field-tooltip">Tooltip</Label>
          <Input
            id="field-tooltip"
            value={field.tooltip ?? ""}
            onChange={(event) => onChange({ tooltip: event.target.value || null })}
            placeholder={`Optional, ${MIN_TOOLTIP_LENGTH}-${MAX_TOOLTIP_LENGTH} characters`}
          />
        </div>
        <ToggleRow label="Required?" checked={field.isRequired} onChange={(checked) => onChange({ isRequired: checked })} />
        <ToggleRow label="Add to Policy Rules" checked={field.addToPolicyRules} onChange={(checked) => onChange({ addToPolicyRules: checked })} />
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Conditional Visibility</h3>
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
          <p className="text-xs text-muted-foreground">Add at least one Dropdown field to create conditional rules.</p>
        ) : field.conditionalVisibility ? (
          <div className="grid grid-cols-2 gap-2">
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
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Red Flags</h3>
        <div className="flex gap-4 text-sm">
          {(["formula", "ai"] as CategoryFieldRedFlagMode[]).map((mode) => (
            <label key={mode} className="flex items-center gap-2">
              <input type="radio" name={`redflag-mode-${field.id}`} checked={field.redFlagMode === mode} onChange={() => onChange({ redFlagMode: mode })} />
              {mode === "formula" ? "Formula Based" : "AI Based"}
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input type="radio" name={`redflag-mode-${field.id}`} checked={field.redFlagMode === null} onChange={() => onChange({ redFlagMode: null, redFlagValue: null, redFlagAction: null })} />
            None
          </label>
        </div>

        {field.redFlagMode ? (
          <>
            {field.redFlagMode === "ai" ? (
              <div className="space-y-1">
                <Textarea
                  value={field.redFlagValue ?? ""}
                  onChange={(event) => onChange({ redFlagValue: event.target.value })}
                  rows={3}
                  maxLength={MAX_RED_FLAG_DESCRIPTION_LENGTH}
                  placeholder="Describe your Red Flag…"
                />
                <p className="text-xs text-muted-foreground">
                  {MIN_RED_FLAG_DESCRIPTION_LENGTH}-{MAX_RED_FLAG_DESCRIPTION_LENGTH} characters.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <Input value={field.redFlagValue ?? ""} onChange={(event) => onChange({ redFlagValue: event.target.value })} placeholder="e.g. {{Amount}} > 5000" />
                <p className="text-xs text-muted-foreground">
                  Reference fields with <code>{"{{FieldName}}"}</code>. Available:{" "}
                  {[...numericFieldNames, ...dateFieldNames].join(", ") || "none yet"}.
                </p>
              </div>
            )}
            <div className="flex gap-4 text-sm">
              {(["highlight", "block"] as CategoryFieldRedFlagAction[]).map((action) => (
                <label key={action} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`redflag-action-${field.id}`}
                    checked={field.redFlagAction === action}
                    onChange={() => onChange({ redFlagAction: action })}
                  />
                  {action === "highlight" ? "Highlight" : "Block"}
                </label>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <FieldTypeSpecificConfig field={field} updateConfig={updateConfig} onChange={onChange} numericFieldNames={numericFieldNames} dateFieldNames={dateFieldNames} />
    </div>
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
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">File Settings</h3>
          <div className="space-y-2">
            <Label>Types of File Allowed</Label>
            <FileTypesPicker
              selected={(config.allowedFileTypes as string[] | undefined) ?? []}
              onChange={(selected) => updateConfig({ allowedFileTypes: selected })}
            />
          </div>
          <div className="space-y-2">
            <Label>Maximum File Size (MB)</Label>
            <Input
              type="number"
              value={(config.maxFileSizeMb as number | undefined) ?? DEFAULT_FILE_SIZE_MB}
              onChange={(event) => updateConfig({ maxFileSizeMb: Number(event.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Maximum Number of Files</Label>
            <Input
              type="number"
              value={(config.maxFileCount as number | undefined) ?? DEFAULT_FILE_COUNT}
              onChange={(event) => updateConfig({ maxFileCount: Number(event.target.value) })}
            />
          </div>
        </div>
      );

    case "amount":
    case "number":
      return (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Value Settings</h3>
          <ToggleRow label="Allow Decimal" checked={config.allowDecimal === true} onChange={(checked) => updateConfig({ allowDecimal: checked })} />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Minimum Value</Label>
              <Input type="number" value={(config.minValue as number | string | undefined) ?? ""} onChange={(event) => updateConfig({ minValue: event.target.value === "" ? null : Number(event.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Maximum Value</Label>
              <Input type="number" value={(config.maxValue as number | string | undefined) ?? ""} onChange={(event) => updateConfig({ maxValue: event.target.value === "" ? null : Number(event.target.value) })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Formula Builder</Label>
            <Input value={(config.formula as string | undefined) ?? ""} onChange={(event) => updateConfig({ formula: event.target.value })} placeholder="e.g. {{Quantity}} * {{Unit Price}}" />
            <p className="text-xs text-muted-foreground">
              Available fields: {[...numericFieldNames, ...dateFieldNames].length > 0 ? [...numericFieldNames, ...dateFieldNames].join(", ") : "none yet"}.
              Date fields support difference only, e.g. <code>{"{{End Date}} - {{Start Date}}"}</code>.
            </p>
          </div>
          {field.fieldType === "amount" ? (
            <ToggleRow
              label="Use As Claim Amount"
              checked={config.useAsClaimAmount === true}
              onChange={(checked) => onChange({ config: { ...config, useAsClaimAmount: checked } })}
            />
          ) : null}
        </div>
      );

    case "small_text":
      return (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Text Settings</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Minimum Length</Label>
              <Input type="number" value={(config.minLength as number | string | undefined) ?? ""} onChange={(event) => updateConfig({ minLength: event.target.value === "" ? null : Number(event.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Maximum Length</Label>
              <Input type="number" value={(config.maxLength as number | string | undefined) ?? ""} onChange={(event) => updateConfig({ maxLength: event.target.value === "" ? null : Number(event.target.value) })} />
            </div>
          </div>
          <ToggleRow label="Allow Special Characters" checked={config.allowSpecialCharacters === true} onChange={(checked) => updateConfig({ allowSpecialCharacters: checked })} />
          <ToggleRow label="Allow Numbers" checked={config.allowNumbers === true} onChange={(checked) => updateConfig({ allowNumbers: checked })} />
          <div className="space-y-1">
            <Label>Regex Validation</Label>
            <Input value={(config.regex as string | undefined) ?? ""} onChange={(event) => updateConfig({ regex: event.target.value })} placeholder="Optional regular expression" />
            <p className="text-xs text-muted-foreground">
              GST: <code>^[0-9]{"{2}"}[A-Z]{"{5}"}[0-9]{"{4}"}[A-Z]{"{1}"}[1-9A-Z]{"{1}"}Z[0-9A-Z]{"{1}"}$</code> · Email:{" "}
              <code>^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{"{2,}"}$</code> · Phone (India): <code>^[6-9][0-9]{"{9}"}$</code>
            </p>
          </div>
          {/* Claim Management's useAsInvoiceNumber amendment — optional,
              unlike Use As Claim Amount/Expense Date, so no "exactly one"
              enforcement here; the backend caps it at one per category. */}
          <ToggleRow
            label="Use As Invoice/Bill Number"
            checked={config.useAsInvoiceNumber === true}
            onChange={(checked) => updateConfig({ useAsInvoiceNumber: checked })}
          />
        </div>
      );

    case "large_text":
      return (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Text Settings</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Minimum Length</Label>
              <Input type="number" value={(config.minLength as number | string | undefined) ?? ""} onChange={(event) => updateConfig({ minLength: event.target.value === "" ? null : Number(event.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Maximum Length</Label>
              <Input type="number" value={(config.maxLength as number | string | undefined) ?? ""} onChange={(event) => updateConfig({ maxLength: event.target.value === "" ? null : Number(event.target.value) })} />
            </div>
          </div>
        </div>
      );

    case "list":
      return (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">List Settings</h3>
          <ToggleRow label="Allow Multi-Select" checked={config.allowMultiSelect === true} onChange={(checked) => updateConfig({ allowMultiSelect: checked })} />
          <div className="space-y-2">
            <Label>Values List</Label>
            <SelectField
              value={(config.valuesListKey as string | undefined) ?? ""}
              onValueChange={(value) => updateConfig({ valuesListKey: value })}
              options={CATEGORY_LIST_VALUE_SOURCES.map((source) => ({ value: source.key, label: source.label }))}
            />
          </div>
        </div>
      );

    case "city_list":
      return (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">City List Settings</h3>
          <ToggleRow label="Allow Multi-Select" checked={config.allowMultiSelect === true} onChange={(checked) => updateConfig({ allowMultiSelect: checked })} />
          {config.allowMultiSelect === true ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Minimum Required Selection</Label>
                <Input
                  type="number"
                  value={(config.minRequiredSelection as number | string | undefined) ?? ""}
                  onChange={(event) => updateConfig({ minRequiredSelection: event.target.value === "" ? null : Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
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
              </div>
            </div>
          ) : null}
        </div>
      );

    case "dropdown":
      return (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Dropdown Settings</h3>
          <ToggleRow label="Allow Multi-Select" checked={config.allowMultiSelect === true} onChange={(checked) => updateConfig({ allowMultiSelect: checked })} />
          <div className="space-y-2">
            <Label>Options</Label>
            <OptionsListEditor options={(config.options as string[] | undefined) ?? []} onChange={(options) => updateConfig({ options })} />
          </div>
        </div>
      );

    case "radio_button":
      return (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Options</h3>
          <OptionsListEditor options={(config.options as string[] | undefined) ?? []} onChange={(options) => updateConfig({ options })} />
        </div>
      );

    case "date":
      return (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Date Settings</h3>
          <ToggleRow label="Allow Past Date" checked={config.allowPastDate === true} onChange={(checked) => updateConfig({ allowPastDate: checked })} />
          <ToggleRow label="Allow Future Date" checked={config.allowFutureDate === true} onChange={(checked) => updateConfig({ allowFutureDate: checked })} />
          <ToggleRow label="Use As Expense Date" checked={config.useAsExpenseDate === true} onChange={(checked) => updateConfig({ useAsExpenseDate: checked })} />
        </div>
      );

    case "date_time":
    case "time":
    case "duration":
      return null;
  }
}
