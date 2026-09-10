"use client";

import MuiSwitch, { type SwitchProps as MuiSwitchProps } from "@mui/material/Switch";

// 026's MUI Migration — `onCheckedChange(checked)` replaces MUI's own
// `onChange(event, checked)` signature, preserving every existing call
// site's exact API (checked/onCheckedChange/disabled/aria-label) — no
// caller needs to change.
type SwitchProps = Omit<MuiSwitchProps, "onChange"> & {
  onCheckedChange?: (checked: boolean) => void;
};

function Switch({ onCheckedChange, ...props }: SwitchProps) {
  return <MuiSwitch {...props} onChange={(_event, checked) => onCheckedChange?.(checked)} />;
}

export { Switch };
