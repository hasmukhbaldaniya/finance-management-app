"use client";

import { format } from "date-fns";
import { DateTimePicker as MuiDateTimePicker } from "@mui/x-date-pickers/DateTimePicker";

type DateTimePickerProps = {
  value: string; // "" | "YYYY-MM-DDTHH:mm" — matches <input type="datetime-local">'s own value shape
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
};

// Local time, not UTC — `new Date("YYYY-MM-DDTHH:mm")` (no timezone
// suffix) already parses as local time in every JS engine, matching this
// component's own long-standing contract and native
// <input type="datetime-local">'s own behavior.
function parseDateTime(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

// 026's MUI Migration — internals swap to @mui/x-date-pickers'
// DateTimePicker, a single self-contained component combining calendar +
// time selection in one popup — replacing the old hand-composed
// Popover+Calendar+time-Input. Callers still only ever see the same
// "YYYY-MM-DDTHH:mm" string, never a Date object. `placeholder` maps onto
// the field's `label` — see date-picker.tsx's own comment for why.
export function DateTimePicker({ value, onChange, placeholder = "Select date & time", id, className, disabled }: DateTimePickerProps) {
  return (
    <MuiDateTimePicker
      value={parseDateTime(value)}
      onChange={(date) => onChange(date ? formatDateTime(date) : "")}
      disabled={disabled}
      format="PPP, HH:mm"
      slotProps={{
        textField: {
          id,
          className,
          fullWidth: true,
          size: "small",
          label: placeholder,
        },
      }}
    />
  );
}
