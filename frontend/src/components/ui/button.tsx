import MuiButton, { type ButtonProps as MuiButtonProps } from "@mui/material/Button";
import IconButton, { type IconButtonProps } from "@mui/material/IconButton";

// 026's MUI Migration — every real call site's variant/size vocabulary,
// surveyed across the whole app, is exactly {default,outline,secondary,
// ghost,destructive,link} x {default,sm,icon} (xs/lg/icon-xs/icon-sm/
// icon-lg were defined in the old cva config but had zero real callers).
// `size="icon"` renders as MUI's IconButton instead of Button — every one
// of its 17 real call sites already only ever used `variant="ghost"`
// with a single icon child and an aria-label, which IconButton matches
// natively (a borderless, hover-highlighted button), so this needed no
// new variant-mapping concept of its own.
export type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
export type ButtonSize = "default" | "sm" | "icon";

const VARIANT_TO_MUI: Record<ButtonVariant, { variant: MuiButtonProps["variant"]; color: MuiButtonProps["color"] }> = {
  default: { variant: "contained", color: "primary" },
  outline: { variant: "outlined", color: "inherit" },
  secondary: { variant: "contained", color: "secondary" },
  ghost: { variant: "text", color: "inherit" },
  destructive: { variant: "outlined", color: "error" },
  link: { variant: "text", color: "primary" },
};

type ButtonProps = Omit<MuiButtonProps, "variant" | "color" | "size"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

function Button({ variant = "default", size = "default", sx, children, ...props }: ButtonProps) {
  if (size === "icon") {
    return (
      <IconButton size="small" {...(props as IconButtonProps)} sx={sx}>
        {children}
      </IconButton>
    );
  }

  const mapped = VARIANT_TO_MUI[variant];
  return (
    <MuiButton
      variant={mapped.variant}
      color={mapped.color}
      size={size === "sm" ? "small" : "medium"}
      sx={{ ...(variant === "link" ? { textDecoration: "underline", textUnderlineOffset: "4px" } : {}), ...sx }}
      {...props}
    >
      {children}
    </MuiButton>
  );
}

export { Button };
