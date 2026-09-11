"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { XIcon } from "@phosphor-icons/react";
import { getAirlines } from "@/apis/airline";
import { getCities } from "@/apis/city";
import { statusTones } from "@/theme/colors";
import { DatePicker } from "@/components/date-picker";
import { DateTimePicker } from "@/components/date-time-picker";
import { SelectField } from "@/components/select-field";
import { CitySelect } from "@/components/trip/city-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryField } from "@/types/category.type";
import type { City } from "@/types/city.type";
import type { Airline } from "@/types/airline.type";

type UploadedFileMeta = { name: string; size: number };

function isUploadedFileMetaArray(value: unknown): value is UploadedFileMeta[] {
  return Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null && "name" in item);
}

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
          <Stack
            component="label"
            spacing={0.5}
            sx={{
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              borderRadius: 2,
              border: 1,
              borderStyle: "dashed",
              borderColor: "divider",
              px: 2,
              py: 3,
              textAlign: "center",
              fontSize: "0.875rem",
              color: "text.secondary",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Box component="span">Click to upload{allowedFileTypes.length > 0 ? ` (${allowedFileTypes.join(", ")})` : ""}</Box>
            <Box
              component="input"
              type="file"
              multiple
              sx={{ display: "none" }}
              onChange={(event) => {
                const selected = Array.from((event.target as HTMLInputElement).files ?? []).map((file) => ({ name: file.name, size: file.size }));
                const combined = [...files, ...selected].slice(0, maxFileCount ?? undefined);
                onChange(combined);
                (event.target as HTMLInputElement).value = "";
              }}
            />
          </Stack>
          {files.length > 0 ? (
            <Stack component="ul" spacing={0.5} sx={{ fontSize: "0.875rem", listStyle: "none", p: 0, m: 0 }}>
              {files.map((file, index) => (
                <Stack
                  component="li"
                  direction="row"
                  key={`${file.name}-${index}`}
                  spacing={1}
                  sx={{ alignItems: "center", justifyContent: "space-between", borderRadius: 1.5, border: 1, borderColor: "divider", px: 1, py: 0.5 }}
                >
                  <Typography variant="body2" noWrap>
                    {file.name}
                  </Typography>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}
                    aria-label={`Remove ${file.name}`}
                    sx={{ color: "text.secondary", background: "none", border: "none", cursor: "pointer", display: "flex", "&:hover": { color: "error.main" } }}
                  >
                    <XIcon size={14} />
                  </Box>
                </Stack>
              ))}
            </Stack>
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
          {isComputed ? (
            <Typography variant="caption" color="text.secondary">
              Computed automatically.
            </Typography>
          ) : null}
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
          <Textarea
            value={(value as string | undefined) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            maxLength={typeof config.maxLength === "number" ? config.maxLength : undefined}
            rows={3}
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
          <SelectField
            value={(value as string | undefined) ?? ""}
            onValueChange={(next) => onChange(next || null)}
            placeholder="Select…"
            options={options.map((option) => ({ value: option, label: option }))}
          />
        </FieldWrapper>
      );
    }

    case "radio_button": {
      const options = Array.isArray(config.options) ? (config.options as string[]) : [];
      return (
        <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", fontSize: "0.875rem" }}>
            {options.map((option) => (
              <Box component="label" key={option} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <input type="radio" name={`field-${field.id}`} checked={value === option} onChange={() => onChange(option)} />
                {option}
              </Box>
            ))}
          </Stack>
        </FieldWrapper>
      );
    }

    case "date":
      return (
        <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
          <DatePicker value={(value as string | undefined) ?? ""} onChange={(next) => onChange(next || null)} />
        </FieldWrapper>
      );

    case "date_time":
      return (
        <FieldWrapper label={label} tooltip={field.tooltip} error={error} isAutoFilled={isAutoFilled}>
          <DateTimePicker value={(value as string | undefined) ?? ""} onChange={(next) => onChange(next || null)} />
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
    <Stack spacing={0.75}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Label title={tooltip ?? undefined}>{label}</Label>
        {isAutoFilled ? (
          <Chip label="Auto-filled" size="small" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 500, bgcolor: statusTones.accepted.background, color: statusTones.accepted.text }} />
        ) : null}
      </Stack>
      {children}
      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
    </Stack>
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
        <SelectField
          value={value !== null && value !== undefined ? String(value) : ""}
          onValueChange={(next) => onChange(next ? Number(next) : null)}
          placeholder="Select…"
          options={airlines.map((airline) => ({ value: String(airline.id), label: airline.name }))}
        />
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
      <Stack spacing={1}>
        {ids.length > 0 ? (
          <Stack component="ul" direction="row" spacing={1} sx={{ flexWrap: "wrap", listStyle: "none", p: 0, m: 0 }}>
            {ids.map((id) => {
              const city = cityFor(id);
              return (
                <Stack
                  component="li"
                  direction="row"
                  key={id}
                  spacing={0.5}
                  sx={{ alignItems: "center", borderRadius: 999, border: 1, borderColor: "divider", bgcolor: "action.hover", px: 1, py: 0.5, fontSize: "0.75rem" }}
                >
                  {city ? `${city.name}, ${city.countryName}` : `#${id}`}
                  <Box
                    component="button"
                    type="button"
                    onClick={() => onChange(ids.filter((existing) => existing !== id))}
                    aria-label="Remove city"
                    sx={{ display: "flex", background: "none", border: "none", cursor: "pointer" }}
                  >
                    <XIcon size={12} />
                  </Box>
                </Stack>
              );
            })}
          </Stack>
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
      </Stack>
    </FieldWrapper>
  );
}
