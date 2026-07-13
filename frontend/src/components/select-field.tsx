"use client";

import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

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

// 026's MUI Migration — MUI's Select allows an empty-string `value`
// natively (unlike Base UI's, which reserves "" to mean "nothing
// selected"), so the old EMPTY_VALUE_SENTINEL workaround this component
// used to need is dropped outright, not just hidden behind the interface.
// Same external value/onValueChange/options/placeholder/disabled/
// hasError/className/id shape every caller already used — a plain
// string, including "" for an "All"-style option, exactly like a native
// <select> always worked.
export function SelectField({ value, onValueChange, options, placeholder = "Select…", disabled, hasError, className, id }: SelectFieldProps) {
  return (
    <Select
      id={id}
      className={className}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      disabled={disabled}
      error={hasError}
      displayEmpty
      fullWidth
      size="small"
      renderValue={(selected) => {
        const matched = options.find((option) => option.value === selected);
        if (matched) return matched.label;
        return <span style={{ opacity: 0.6 }}>{placeholder}</span>;
      }}
    >
      {options.map((option) => (
        <MenuItem key={option.value || "__empty__"} value={option.value} disabled={option.disabled}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
}
