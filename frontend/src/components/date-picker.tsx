"use client";

import { format } from "date-fns";
import { DatePicker as MuiDatePicker } from "@mui/x-date-pickers/DatePicker";
import type { SxProps, Theme } from "@mui/material/styles";

type DatePickerProps = {
  value: string; // "" | "YYYY-MM-DD" — matches <input type="date">'s own value shape
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  sx?: SxProps<Theme>;
  disabled?: boolean;
  hasError?: boolean;
};

// Local midnight, not UTC — matches this component's own long-standing
// contract (and native <input type="date">'s own behavior), so a date
// picked in any timezone maps to the exact calendar day shown, never
// shifting by a day.
function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// 026's MUI Migration — internals swap to @mui/x-date-pickers' DatePicker
// (a single self-contained trigger+popover+calendar component, replacing
// the old hand-composed Popover+Calendar), doing the string<->Date
// conversion at this component's own boundary — callers still only ever
// see the same "YYYY-MM-DD" string, never a Date object. `placeholder`
// maps onto the field's `label` rather than a literal placeholder — MUI's
// sectioned date field has no single placeholder string slot (each
// date/month/year section shows its own token when empty), so a
// floating label is the closest equivalent "hint when empty" mechanism.
export function DatePicker({ value, onChange, placeholder = "Select date", id, className, sx, disabled, hasError }: DatePickerProps) {
  return (
    <MuiDatePicker
      value={parseDateOnly(value)}
      onChange={(date) => onChange(date ? formatDateOnly(date) : "")}
      disabled={disabled}
      format="PPP"
      slotProps={{
        textField: {
          id,
          className,
          // A caller's `height` (every filter row in this codebase passes
          // `sx={{ height: 32 }}` to line this field up with adjacent
          // Selects/Inputs) only reaches the outer MuiFormControl-root —
          // MUI X's PickersInputBase renders its own ~40px box regardless,
          // so without this it silently doesn't match a same-row Select at
          // the same height. `height: inherit` makes it pick up whatever
          // the FormControl above actually resolved to, instead of hardcoding
          // a second copy of the caller's height here.
          sx: [{ "& .MuiPickersInputBase-root": { height: "inherit" } }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])],
          fullWidth: true,
          size: "small",
          label: placeholder,
          error: hasError,
        },
      }}
    />
  );
}
