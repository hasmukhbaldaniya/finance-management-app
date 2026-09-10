import TextField, { type TextFieldProps } from "@mui/material/TextField";

// 026's MUI Migration — every existing call site already uses the plain
// native-textarea prop shape (id/value/onChange(event)/placeholder/
// maxLength/rows), which MUI's TextField (multiline) accepts identically —
// no caller needs to change. `maxLength` specifically isn't a top-level
// TextField prop (MUI routes raw <textarea> attributes through
// `slotProps.htmlInput`), so it's accepted here and forwarded internally,
// keeping every caller's own prop shape untouched.
type TextareaProps = Omit<TextFieldProps, "multiline"> & {
  maxLength?: number;
};

function Textarea({ maxLength, slotProps, ...props }: TextareaProps) {
  return (
    <TextField
      multiline
      fullWidth
      slotProps={{
        ...slotProps,
        htmlInput: { ...slotProps?.htmlInput, maxLength },
      }}
      {...props}
    />
  );
}

export { Textarea };
