import OutlinedInput, { type OutlinedInputProps } from "@mui/material/OutlinedInput";

// 026's MUI Migration — every existing call site already uses the plain
// native-input prop shape (id/type/value/onChange/placeholder/disabled/
// aria-invalid/aria-describedby/autoFocus/maxLength/min/max), which
// OutlinedInput accepts identically (maxLength/min/max forwarded through
// slotProps.input, since they aren't top-level props, same as
// ui/textarea.tsx's own maxLength handling) — no caller needs to change.
// Deliberately kept as a standalone input (not MUI's bundled TextField),
// since this codebase's own Label is always a separate sibling element,
// not a label prop — merging the two would mean restructuring every one
// of this component's ~45 call sites, out of scope for a
// behavior-preserving primitive swap.
type InputProps = OutlinedInputProps & {
  maxLength?: number;
  min?: string | number;
  max?: string | number;
};

function Input({ maxLength, min, max, slotProps, ...props }: InputProps) {
  return (
    <OutlinedInput
      fullWidth
      size="small"
      slotProps={{
        ...slotProps,
        input: { ...slotProps?.input, maxLength, min, max },
      }}
      {...props}
    />
  );
}

export { Input };
