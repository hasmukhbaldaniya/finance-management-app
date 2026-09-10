// 026's MUI Migration — the one file a developer edits to add, remove, or
// change a color. `theme.ts` is the only other file that reads from here;
// nothing else in the app should import raw color values directly.
//
// Every value below carries forward this app's existing grayscale palette
// from `globals.css`'s oklch tokens (today's shadcn/Tailwind design system,
// see that file's `:root` block) — Tailwind CSS 4's own `zinc` scale is a
// near-exact match for those oklch values, so hex equivalents are sourced
// from it rather than re-deriving oklch->hex by hand. `destructive`
// (`oklch(0.577 0.245 27.325)`) is Tailwind v4's own `red-600` value,
// confirmed exact, not approximated.

export type StatusToneKey = "pending" | "accepted" | "rejected" | "info";

export type StatusTone = {
  background: string;
  text: string;
};

// Every existing badge/chip in the app (claim-status-badge.tsx,
// split-request-status-badge.tsx, trip-status-badge.tsx, amount-chip.tsx)
// uses one of these background/text pairs today, as ad hoc literal Tailwind
// classes (`bg-green-100 text-green-800`, etc.) repeated per component. Once
// Phase 2/3 migrates those components, they read from here instead —
// add a new tone here, not a new literal color in a component. `info` was
// added for Claim's "Submitted" status (`bg-blue-100 text-blue-800`), the
// one status tone the original three didn't cover.
export const statusTones: Record<StatusToneKey, StatusTone> = {
  pending: { background: "#fef3c7", text: "#92400e" }, // amber-100 / amber-800
  accepted: { background: "#dcfce7", text: "#166534" }, // green-100 / green-800
  rejected: { background: "#fee2e2", text: "#b91c1c" }, // red-100 / red-700
  info: { background: "#dbeafe", text: "#1e40af" }, // blue-100 / blue-800
};

// The amount-chip's own green icon-badge style — kept distinct from
// `statusTones.accepted` since it's an icon badge, not a text pill, even
// though the color happens to be the same family.
export const chipColors = {
  amountIconBackground: "#dcfce7", // green-100
  amountIconForeground: "#15803d", // green-700
};

export const grayScale = {
  white: "#ffffff",
  gray50: "#fafafa", // zinc-50
  gray100: "#f4f4f5", // zinc-100
  gray200: "#e4e4e7", // zinc-200
  gray300: "#d4d4d8", // zinc-300
  gray400: "#a1a1aa", // zinc-400
  gray500: "#71717a", // zinc-500
  gray700: "#3f3f46", // zinc-700
  gray800: "#27272a", // zinc-800
  gray900: "#18181b", // zinc-900
};

export type PaletteColorTokens = {
  light: string;
  main: string;
  dark: string;
  contrastText: string;
};

// MUI's 6 built-in palette keys. `primary`/`secondary` carry forward
// today's grayscale brand-less look exactly (see 026's own Open Questions
// on whether a real brand color should be introduced later) — `error`
// matches `--destructive` exactly; `warning`/`info`/`success` didn't have
// a semantic equivalent in the old palette (only ad hoc badge literals, see
// `statusTones` above) so sensible, commonly-used shades were chosen.
export const paletteColors: Record<"primary" | "secondary" | "error" | "warning" | "info" | "success", PaletteColorTokens> = {
  primary: {
    light: grayScale.gray700,
    main: grayScale.gray800,
    dark: grayScale.gray900,
    contrastText: grayScale.gray50,
  },
  secondary: {
    light: grayScale.gray50,
    main: grayScale.gray100,
    dark: grayScale.gray200,
    contrastText: grayScale.gray800,
  },
  error: {
    light: "#ef4444", // red-500
    main: "#dc2626", // red-600 — matches `--destructive` exactly
    dark: "#b91c1c", // red-700
    contrastText: grayScale.gray50,
  },
  warning: {
    light: "#f59e0b", // amber-500
    main: "#d97706", // amber-600
    dark: "#92400e", // amber-800
    contrastText: grayScale.white,
  },
  info: {
    light: "#3b82f6", // blue-500
    main: "#2563eb", // blue-600
    dark: "#1d4ed8", // blue-700
    contrastText: grayScale.white,
  },
  success: {
    light: "#22c55e", // green-500
    main: "#16a34a", // green-600
    dark: "#15803d", // green-700
    contrastText: grayScale.white,
  },
};

// Carries forward `--background`/`--foreground`/`--muted-foreground`/
// `--border` from `globals.css` — MUI's `palette.background`/`text`/
// `divider` keys.
export const surfaceColors = {
  background: grayScale.white,
  paper: grayScale.white,
  textPrimary: "#171717", // matches --foreground (oklch(0.145 0 0))
  textSecondary: grayScale.gray500, // matches --muted-foreground
  divider: grayScale.gray200, // matches --border / --input
};
