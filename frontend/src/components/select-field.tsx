"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectFieldOption = { value: string; label: string; disabled?: boolean };

type SelectFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectFieldOption[];
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  id?: string;
};

// Base UI's Select (like Radix's) reserves an empty string as "no value
// selected," so a real empty-string option (e.g. an "All" filter choice)
// needs a stand-in internally — translated back at the edges so callers
// keep using "" exactly like a native <select> always did.
const EMPTY_VALUE_SENTINEL = "__empty__";

// A single-select shadcn Select wrapper replacing native <select> across
// the app — same value/onChange shape every native select already used
// (a plain string, including "" for an "All"-style option), just backed by
// shadcn's Select instead of hand-styling a native element.
export function SelectField({ value, onValueChange, options, placeholder = "Select…", disabled, hasError, className, id }: SelectFieldProps) {
  return (
    <Select
      value={value === "" ? EMPTY_VALUE_SENTINEL : value}
      onValueChange={(next: string | null) => onValueChange(!next || next === EMPTY_VALUE_SENTINEL ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn("h-8 w-full", hasError && "border-destructive", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value || EMPTY_VALUE_SENTINEL} value={option.value === "" ? EMPTY_VALUE_SENTINEL : option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
