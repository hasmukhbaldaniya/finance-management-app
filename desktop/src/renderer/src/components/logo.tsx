import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";

type LogoMarkProps = {
  sx?: SxProps<Theme>;
};

export function LogoMark({ sx }: LogoMarkProps) {
  return (
    <Box
      component="svg"
      viewBox="0 0 100 100"
      role="img"
      aria-label="Finance Management"
      sx={{ width: 36, height: 36, flexShrink: 0, ...sx }}
    >
      <rect width="100" height="100" rx="22" fill="#1c1c1e" />
      <path d="M28 28 H62 L72 38 V72 H28 Z" fill="none" stroke="#ece8df" strokeWidth={6} strokeLinejoin="round" />
      <rect x="60" y="52" width="16" height="16" rx="4" fill="#3457ff" />
    </Box>
  );
}

type LogoProps = {
  sx?: SxProps<Theme>;
};

// 026's MUI Migration Phase 4 — re-styled via Box/Typography + sx.
export function Logo({ sx }: LogoProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, ...sx }}>
      <LogoMark />
      <Box sx={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <Typography component="span" sx={{ fontSize: "1.125rem", fontWeight: 800, letterSpacing: "-0.01em" }}>
          finance
        </Typography>
        <Typography component="span" color="text.secondary" sx={{ fontSize: "0.625rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Management
        </Typography>
      </Box>
    </Box>
  );
}
