import Typography from "@mui/material/Typography";
import type { ComponentProps } from "react";

// 026's MUI Migration — kept as a standalone label (MUI's own InputLabel
// assumes a FormControl context this codebase doesn't use, since Input
// above is a bare OutlinedInput, not a bundled TextField) — a styled
// Typography rendering as a real <label>, same external className/
// htmlFor/children shape every existing call site already uses.
function Label({ className, ...props }: ComponentProps<"label">) {
  return <Typography component="label" variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 500 }} className={className} {...props} />;
}

export { Label };
