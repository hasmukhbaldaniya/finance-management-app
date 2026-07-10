"use client";

import { useEffect, useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import { getAirlines } from "@/apis/airline";
import { getCities } from "@/apis/city";
import { CitySelect } from "@/components/trip/city-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryField } from "@/types/category.type";
import type { City } from "@/types/city.type";
import type { Airline } from "@/types/airline.type";

type UploadedFileMeta = { name: string; size: number };

function isUploadedFileMetaArray(value: unknown): value is UploadedFileMeta[] {
  return Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null && "name" in item);
}

const TEXTAREA_CLASS =
  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

type ExpenseFieldRendererProps = {
  field: CategoryField;
  value: unknown;
  // Set only for amount/number fields with config.formula — overrides
  // `value` and renders read-only, matching 022's "Number of
  // Nights"/"Per Night Rate" reference screenshot.
  computedValue?: number | null;
  onChange: (value: unknown) => void;
  error?: string;
  // Set only by the AI review screen — the reference screenshots show an
  // "Auto-filled" badge on each field the AI successfully extracted, which
  // disappears the moment the employee edits it (022/023's own review posture).
  isAutoFilled?: boolean;
};

// The single most important new building block in Claim Management — a
// Category's own Step 2 field configuration IS the expense form (022's
// Overview). This renders the correct data-entry control for each of the 14
// CategoryFieldTypes, reading the same config keys
// components/category/field-config-panel.tsx already writes at
// category-configuration time, just as constraints/options here instead of
// admin settings. Consumed identically by the manual flow and the AI
// review screen.
export function ExpenseFieldRenderer({ field, value, computedValue, onChange, error, isAutoFilled }: ExpenseFieldRendererProps) {
  const { config } = field;
  const label = `${field.fieldName}${field.isRequired ? " *" : ""}`;

  switch (field.fieldType) {
    case "invoice":
    case "file_upload": {
      const files = isUploadedFileMetaArray(value) ? value : [];
      const maxFileCount = typeof config.maxFileCount === "number" ? config.maxFileCount : undefined;
      const allowedFileTypes = Array.isArray(config.allowedFileTypes) ? (config.allowedFileTypes as string[]) : [];

      return (
        <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground hover:bg-muted/50">
            <span>Click to upload{allowedFileTypes.length > 0 ? ` (${allowedFileTypes.join(", ")})` : ""}</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? []).map((file) => ({ name: file.name, size: file.size }));
                const combined = [...files, ...selected].slice(0, maxFileCount ?? undefined);
                onChange(combined);
                event.target.value = "";
              }}
            />
          </label>
          {files.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${file.name}`}
                  >
                    <XIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </FieldWrapper>
      );
    }

    case "amount":
    case "number": {
      const isComputed = typeof config.formula === "string" && config.formula.trim().length > 0;
      const displayValue = isComputed ? (computedValue ?? "") : ((value as string | number | undefined) ?? "");
      return (
        <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
          <Input
            type="number"
            value={displayValue}
            disabled={isComputed}
            onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
            min={typeof config.minValue === "number" ? config.minValue : undefined}
            max={typeof config.maxValue === "number" ? config.maxValue : undefined}
          />
          {isComputed ? <p className="text-xs text-muted-foreground">Computed automatically.</p> : null}
        </FieldWrapper>
      );
    }

    case "small_text":
      return (
        <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
          <Input
            value={(value as string | undefined) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            maxLength={typeof config.maxLength === "number" ? config.maxLength : undefined}
          />
        </FieldWrapper>
      );

    case "large_text":
      return (
        <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
          <textarea
            value={(value as string | undefined) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            maxLength={typeof config.maxLength === "number" ? config.maxLength : undefined}
            rows={3}
            className={TEXTAREA_CLASS}
          />
        </FieldWrapper>
      );

    case "list":
      return <ListFieldRenderer field={field} value={value} onChange={onChange} label={label} error={error} isAutoFilled={isAutoFilled} />;

    case "city_list":
      return <CityListFieldRenderer field={field} value={value} onChange={onChange} label={label} error={error} isAutoFilled={isAutoFilled} />;

    case "dropdown": {
      const options = Array.isArray(config.options) ? (config.options as string[]) : [];
      return (
        <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
          <select
            value={(value as string | undefined) ?? ""}
            onChange={(event) => onChange(event.target.value || null)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Select…</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FieldWrapper>
      );
    }

    case "radio_button": {
      const options = Array.isArray(config.options) ? (config.options as string[]) : [];
      return (
        <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
          <div className="flex flex-wrap gap-4 text-sm">
            {options.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input type="radio" name={`field-${field.id}`} checked={value === option} onChange={() => onChange(option)} />
                {option}
              </label>
            ))}
          </div>
        </FieldWrapper>
      );
    }

    case "date":
      return (
        <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
          <Input type="date" value={(value as string | undefined) ?? ""} onChange={(event) => onChange(event.target.value || null)} />
        </FieldWrapper>
      );

    case "date_time":
      return (
        <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
          <Input type="datetime-local" value={(value as string | undefined) ?? ""} onChange={(event) => onChange(event.target.value || null)} />
        </FieldWrapper>
      );

    case "time":
      return (
        <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
          <Input type="time" value={(value as string | undefined) ?? ""} onChange={(event) => onChange(event.target.value || null)} />
        </FieldWrapper>
      );

    case "duration":
      return (
        <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
          <Input
            type="text"
            placeholder="e.g. 2h 30m"
            value={(value as string | undefined) ?? ""}
            onChange={(event) => onChange(event.target.value || null)}
          />
        </FieldWrapper>
      );
  }
}

function FieldWrapper({
  label,
  tooltip,
  error,
  isAutoFilled,
  children,
}: {
  label: string;
  tooltip: string | null;
  error?: string;
  isAutoFilled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label title={tooltip ?? undefined}>{label}</Label>
        {isAutoFilled ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">Auto-filled</span> : null}
      </div>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

// "list" field type — options come from a named source (config.valuesListKey),
// not admin-entered options. Only "airlines" has a real backing catalog
// today; "based_locations" has no data source anywhere in this codebase yet
// (a pre-existing gap, not introduced here) so it degrades to a plain text
// input.
function ListFieldRenderer({
  field,
  value,
  onChange,
  label,
  error,
  isAutoFilled,
}: {
  field: CategoryField;
  value: unknown;
  onChange: (value: unknown) => void;
  label: string;
  error?: string;
  isAutoFilled?: boolean;
}) {
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const valuesListKey = field.config.valuesListKey;

  useEffect(() => {
    if (valuesListKey === "airlines") {
      getAirlines()
        .then((response) => setAirlines(response.airlines))
        .catch(() => setAirlines([]));
    }
  }, [valuesListKey]);

  if (valuesListKey === "airlines") {
    return (
      <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
        <select
          value={(value as number | string | undefined) ?? ""}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Select…</option>
          {airlines.map((airline) => (
            <option key={airline.id} value={airline.id}>
              {airline.name}
            </option>
          ))}
        </select>
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
      <Input value={(value as string | undefined) ?? ""} onChange={(event) => onChange(event.target.value)} />
    </FieldWrapper>
  );
}

// city_list — backed by the real Country/City catalog (Claim Management's
// city_list migration), storing real City id(s) as the value, not names.
// Resolves any already-saved id(s) back to a display City via GET
// /api/cities?ids= (e.g. reopening a draft expense or an AI-extracted one).
function CityListFieldRenderer({
  field,
  value,
  onChange,
  label,
  error,
  isAutoFilled,
}: {
  field: CategoryField;
  value: unknown;
  onChange: (value: unknown) => void;
  label: string;
  error?: string;
  isAutoFilled?: boolean;
}) {
  const allowMultiSelect = field.config.allowMultiSelect === true;
  const ids = allowMultiSelect
    ? Array.isArray(value)
      ? (value as unknown[]).map(Number).filter(Number.isFinite)
      : []
    : typeof value === "number"
      ? [value]
      : [];

  const [resolved, setResolved] = useState<City[]>([]);

  useEffect(() => {
    const missing = ids.filter((id) => !resolved.some((city) => city.id === id));
    if (missing.length === 0) return;
    getCities({ ids: missing })
      .then((response) => setResolved((previous) => [...previous, ...response.cities]))
      .catch(() => undefined);
    // Only re-run when the set of ids actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  function cityFor(id: number): City | null {
    return resolved.find((city) => city.id === id) ?? null;
  }

  if (!allowMultiSelect) {
    return (
      <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
        <CitySelect value={ids[0] !== undefined ? cityFor(ids[0]) : null} onChange={(city) => onChange(city.id)} placeholder="Select city" />
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
      <div className="space-y-2">
        {ids.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {ids.map((id) => {
              const city = cityFor(id);
              return (
                <li key={id} className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-xs">
                  {city ? `${city.name}, ${city.countryName}` : `#${id}`}
                  <button type="button" onClick={() => onChange(ids.filter((existing) => existing !== id))} aria-label="Remove city">
                    <XIcon size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        <CitySelect
          value={null}
          onChange={(city) => {
            if (ids.includes(city.id)) return;
            setResolved((previous) => (previous.some((existing) => existing.id === city.id) ? previous : [...previous, city]));
            onChange([...ids, city.id]);
          }}
          placeholder="Add city"
        />
      </div>
    </FieldWrapper>
  );
}
