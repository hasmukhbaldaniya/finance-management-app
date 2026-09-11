"use client";

import MuiCheckbox, { type CheckboxProps as MuiCheckboxProps } from "@mui/material/Checkbox";

// 026's MUI Migration — `onCheckedChange(checked)` replaces MUI's own
// `onChange(event, checked)` signature, preserving every existing call
// site's exact API (checked/disabled/id/onCheckedChange) — no caller
// needs to change. Every existing call site already compares
// `checked === true` rather than relying on an "indeterminate" checked
// value, so a plain boolean here is a faithful match, not a narrowing.
type CheckboxProps = Omit<MuiCheckboxProps, "onChange"> & {
  onCheckedChange?: (checked: boolean) => void;
};

function Checkbox({ onCheckedChange, ...props }: CheckboxProps) {
  return <MuiCheckbox {...props} onChange={(_event, checked) => onCheckedChange?.(checked)} />;
}

export { Checkbox };
