import { createTheme } from "@mui/material/styles";
import { chipColors, paletteColors, statusTones, surfaceColors, type StatusTone, type StatusToneKey } from "./colors";

// MUI's own documented mechanism for extending the palette with keys
// beyond its 6 built-in ones (026's Establish the MUI Theme & Colors
// Foundation story) — lets `theme.palette.status.pending`/`theme.palette.chip`
// type-check anywhere in the app.
declare module "@mui/material/styles" {
  interface Palette {
    status: Record<StatusToneKey, StatusTone>;
    chip: typeof chipColors;
  }
  interface PaletteOptions {
    status?: Record<StatusToneKey, StatusTone>;
    chip?: typeof chipColors;
  }
}

// The one file that calls createTheme() — every color value comes from
// `colors.ts`, never inlined here, so changing a color never means editing
// this file.
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: paletteColors.primary,
    secondary: paletteColors.secondary,
    error: paletteColors.error,
    warning: paletteColors.warning,
    info: paletteColors.info,
    success: paletteColors.success,
    background: {
      default: surfaceColors.background,
      paper: surfaceColors.paper,
    },
    text: {
      primary: surfaceColors.textPrimary,
      secondary: surfaceColors.textSecondary,
    },
    divider: surfaceColors.divider,
    status: statusTones,
    chip: chipColors,
  },
  typography: {
    // Reuses the Montserrat CSS variable already loaded via next/font/google
    // in app/layout.tsx — not reloaded a second way.
    fontFamily: "var(--font-sans), sans-serif",
  },
  shape: {
    // Matches globals.css's `--radius: 0.625rem` (10px at the default 16px
    // root font size), so existing corner-rounding doesn't visually jump.
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },
    MuiSelect: {
      defaultProps: {
        size: "small",
      },
    },
  },
});
