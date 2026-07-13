# 027 - shadcn/ui Migration (Reverting Off MUI)

**Status:** Draft
**Epic:** shadcn/ui Migration

## Overview

This is the **mirror image of `026` (MUI Migration)** — a contingency spec for converting the frontend back off MUI (`@mui/material` 9.2.0 + `@mui/x-date-pickers`) onto shadcn/ui (Tailwind CSS 4 + Base UI primitives), for use **only if** the organization decides, after adopting MUI via `026`, that it wants to move back. It exists so that decision doesn't start from a blank page a second time.

**This doc assumes `026` was fully implemented as written** — every shadcn primitive replaced, every page re-styled via `sx`/`styled()`, Tailwind fully removed, toasts on `Snackbar`+`Alert`, a `theme.ts`/`colors.ts` foundation in place. Everything below describes undoing that, back to the state this codebase was already in before `026` (see `frontend/CLAUDE.md`'s pre-`026` "Dates and selects are shadcn-backed" section for the exact shape being restored) — not a novel design.

Same non-negotiables as `026`, reversed direction:
1. **No functionality regressions** — every validation rule, message, and behavior carries over unchanged; this is presentation-layer only.
2. **A theme/tokens file developers can edit in one place** — shadcn's equivalent of `026`'s `theme.ts`/`colors.ts` is `src/app/globals.css`'s `@theme inline` block plus its `:root`/`.dark` CSS-variable definitions (see the first story below) — not a `.ts` file, since Tailwind's token system is CSS-native, not JS-object-based like MUI's `createTheme()`.
3. **Every component gets a Storybook story** — same bar `026` and this codebase's own convention already hold.
4. **Phased rollout, not big-bang** — same reasoning as `026`: page/feature layout code will again be the largest surface (every `sx`/`styled()` usage introduced by `026` needs re-authoring as Tailwind classes), not just the primitive swap.
5. **Toasts move back from `Snackbar`+`Alert` to `sonner`** (mirroring `026`'s decision to move the other way), restoring `ui/sonner.tsx`'s themed wrapper.

Because this is a hypothetical reversal rather than a request against the current codebase, treat every "restore" reference below as **pointing at what `026`'s own doc already specifies**, not at files that exist today — if `026`'s actual implementation ends up deviating from its own spec in any way, this doc's assumptions should be re-verified against the real MUI-based code at that time, not against `026`'s text alone (see [Open Questions](#open-questions--assumptions)).

---

## Story: Restore the Tailwind/shadcn Design Token Foundation

**As a** frontend developer working on this app
**I want** the Tailwind CSS-variable token system and shadcn's CLI-driven component setup back in place
**So that** the rest of the reversal has a foundation to swap primitives onto, the same way `026`'s theme/colors files gave that migration its foundation

### Screens & Fields

Not a user-facing screen — restores the foundational files `026` replaced.

| Artifact | Path | Purpose |
|----------|------|---------|
| Tailwind + shadcn CSS entrypoint | `frontend/src/app/globals.css` | Re-adds `@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, the `@theme inline` token-mapping block, `:root`/`.dark` CSS-variable definitions, and the `@layer base` reset — restoring the exact structure documented in `frontend/CLAUDE.md` prior to `026`. |
| shadcn config | `frontend/components.json` | Re-added via `npx shadcn init` (style `base-nova`, matching what was in place before `026`). |
| Class-merge helper | `frontend/src/lib/utils.ts` | Re-adds `cn()` (`clsx` + `tailwind-merge`), needed again the moment any component takes conditional/merged Tailwind classes. |
| Dependencies | `frontend/package.json` | Re-adds `tailwindcss`, `@tailwindcss/postcss`, `tailwind-merge`, `clsx`, `tw-animate-css`, `@base-ui/react`, `class-variance-authority`, `react-day-picker`, `sonner`, `next-themes`, and the `shadcn` CLI devDependency; removes `@mui/material`, `@mui/x-date-pickers`, `@mui/material-nextjs`, `@emotion/react`, `@emotion/styled`. |

### Flow

1. `colors.ts`/`theme.ts`'s palette values (`026`'s single source of truth for color) are translated back into `globals.css`'s oklch CSS variables — same mapping `026` itself performed in reverse (that story's own Flow step 1 explicitly enumerates which shadcn tokens became which palette keys; this step just runs it backwards).
2. Any palette key `026` added beyond MUI's built-in ones (e.g. a `status`/`chip` key for badge colors) becomes a plain new CSS variable + a corresponding Tailwind utility class reference, the same way today's `green-100`/`amber-100`/`red-100` ad hoc literals worked before `026` — deliberately reverting `026`'s "first-class palette key" improvement, since that mechanism doesn't exist in a pure Tailwind/shadcn setup.
3. `app/layout.tsx` drops `AppRouterCacheProvider`/`ThemeProvider`/`CssBaseline` (MUI's SSR/theme wiring) — nothing replaces it, since Tailwind's tokens apply via plain CSS, no provider component needed.
4. `.storybook/preview.tsx` drops the emotion `CacheProvider`/MUI `ThemeProvider` decorator `026` added — again, nothing replaces it, since shadcn's styling works via globally-loaded CSS, not a React context provider.

### Validation Rules

Not applicable.

### Acceptance Criteria

- **Given** the token foundation is restored, **when** a developer changes a CSS variable in `globals.css` (e.g. `--primary`), **then** every shadcn/Tailwind-styled element referencing that token reflects the change, with no `.ts` theme file left over from `026` still taking precedence.
- **Given** any Storybook story, **when** opened after this story's decorator changes, **then** it still renders correctly themed, now via global CSS rather than a provider.

### Error / Toast Messages

Not applicable.

---

## Story: Migrate Core Primitives Back to shadcn

**As a** frontend developer
**I want** every MUI primitive `026` introduced replaced by its original shadcn equivalent
**So that** every component built on top keeps working, the same "external contract preserved" guarantee `026` itself made in the other direction

### Screens & Fields

The exact reverse of `026`'s own mapping table:

| Current (MUI, per `026`) | Restored (shadcn) | Notes |
|---|---|---|
| `Button` | `ui/button.tsx` (`Button`, `buttonVariants`) | Variant mapping reverses: `contained`→`default`, `outlined`→`outline`, `text`→`ghost`/`link`, `color="error"` variants→`destructive`. |
| `TextField` | `ui/input.tsx` (`Input`) + `ui/label.tsx` (`Label`) rendered separately | `TextField`'s bundled label/helper-text/error props split back into two components — the reverse of the simplification `026` made. |
| `Dialog`/`DialogTitle`/`DialogContent`/`DialogActions` | `ui/dialog.tsx` family, `DialogFooter` replacing `DialogActions` | Re-verify focus-trap/restore-on-close behavior against Base UI's defaults, mirroring `026`'s own MUI-side accessibility check (see [Test Cases](#test-cases)). |
| `Menu`/`MenuItem` | `ui/dropdown-menu.tsx` family | The multi-select eligibility picker reverts from `026`'s `Autocomplete`-with-checkboxes recipe back to `DropdownMenuCheckboxItem` with `closeOnClick={false}` — a genuine loss of `Autocomplete`'s free type-ahead filtering, not just a swap; flag this as a real regression in capability, not a neutral reversal (see [Open Questions](#open-questions--assumptions)). |
| `Select` | `ui/select.tsx` (`Select` family) | Base UI's `Select`, unlike MUI's, does **not** allow an empty-string `value` natively — `select-field.tsx`'s sentinel-mapping workaround (`EMPTY_VALUE_SENTINEL`, removed by `026`) must be **reintroduced**, not just left out, or "All"-style options silently break. |
| `@mui/x-date-pickers`' `DatePicker`/`DateTimePicker` | `ui/popover.tsx` + `ui/calendar.tsx` (`react-day-picker`-backed) | Reverses from a single self-contained MUI component back into a hand-composed Popover+Calendar(+time `Input` for date-time) — more moving parts, matching what these composed components looked like before `026`. |
| `Table`/`TableContainer`/`TableHead`/`TableSortLabel`/etc. | `ui/table.tsx` family | `TableSortLabel`'s built-in sort-direction indicator reverts to this codebase's own hand-rolled sortable-column-header markup. |
| `Switch` | `ui/switch.tsx` (`Switch`) | Direct swap back. |
| `Checkbox` | `ui/checkbox.tsx` (`Checkbox`) | Direct swap back. |
| `TextField` (`multiline`) | `ui/textarea.tsx` (`Textarea`) | Splits back into its own dedicated component. |
| `CircularProgress` | `ui/spinner.tsx` (`Spinner`, custom Phosphor-icon-based) | Direct swap back. |
| `Snackbar` + `Alert` + `026`'s `useToast()`/`ToastProvider` helper | `ui/sonner.tsx` (`Toaster`) + the `sonner` package's `toast()` | The small app-level toast-queue helper `026` had to build (since MUI has no built-in imperative toast function) is deleted outright — `sonner`'s own `toast.success()`/`toast.error()` restores that capability natively, so nothing needs to replace the helper itself, just its call sites. |

### Flow

1. Same one-primitive-at-a-time approach `026` used, in the opposite direction — each primitive reverted and verified against its Storybook story before moving to the next.
2. shadcn and MUI primitives may coexist file-by-file mid-phase, same as `026`'s own coexistence allowance.
3. Every `useToast()` call site (installed by `026`) is swapped back to `toast.success(...)`/`toast.error(...)` with identical message text — same discipline `026` itself required in the other direction.

### Validation Rules

Not applicable — no validation logic changes, only where/how messages render.

### Acceptance Criteria

- **Given** any primitive is reverted, **when** every caller is updated, **then** `tsc`/`next build`/`eslint` are clean and behavior matches pre-`026` exactly (not just "matches `026`'s MUI behavior" — the actual original shadcn behavior, including the sentinel-hack's exact edge-case handling in `select-field.tsx`).
- **Given** the eligibility multi-select picker specifically, **when** reverted to `DropdownMenuCheckboxItem`, **then** the menu still stays open across multiple picks (`closeOnClick={false}`) — acceptable even though type-ahead filtering is lost, per the flagged regression above.

### Error / Toast Messages

Not applicable — every message string carries over unchanged, same rule as `026`.

---

## Story: Migrate Composed & Feature Components Back

**As a** frontend developer
**I want** `date-picker.tsx`, `date-time-picker.tsx`, `select-field.tsx`, and the other composed components' external contracts preserved through the reversal
**So that** every page/form using them needs zero changes, mirroring `026`'s own guarantee

### Screens & Fields

| Component | External contract (unchanged both directions) | What reverts internally |
|---|---|---|
| `date-picker.tsx` / `date-time-picker.tsx` | `"YYYY-MM-DD"` / `"YYYY-MM-DDTHH:mm"` strings, exactly as `026` also preserved | Internals swap from `@mui/x-date-pickers` back to a hand-composed Popover+Calendar(+time `Input`), redoing the string↔`Date` boundary conversion at this component's edge, same care around timezone drift `026`'s own edge cases called out. |
| `select-field.tsx` | Plain string `value`/`onChange`, `""` valid for "All" | Internals swap back to Base UI `Select`, **reintroducing** the private empty-string sentinel mapping `026` deleted — this is not optional, since Base UI's `Select` doesn't support `value=""` the way MUI's does. |
| `password-input.tsx` | `TextField`→`Input`+toggle icon, same Phosphor `EyeIcon`/`EyeSlashIcon` | Swaps `InputAdornment`/`IconButton` toggle back to a plain positioned button, matching the original implementation. |
| `header.tsx` | Same nav/profile menu items, same order | Profile menu reverts from MUI `Menu` back to `DropdownMenu`. |

### Flow

1. Same "public API frozen" discipline `026` applied — every call site across the app needs zero changes.
2. `select-field.tsx`'s sentinel reintroduction is the one place this reversal isn't a pure mechanical inverse of `026` — it's re-adding code `026` explicitly deleted as a simplification, so this needs its own explicit test (see [Test Cases](#test-cases)) rather than being assumed to "just work" by symmetry.

### Validation Rules

Not applicable.

### Acceptance Criteria

- **Given** any page using `DatePicker`/`DateTimePicker`, **when** a date is picked post-reversal, **then** the same string format lands in that page's state, no timezone drift, matching `026`'s own equivalent criterion.
- **Given** `select-field.tsx`'s "All" option, **when** selected, **then** `onChange` still receives `""` — verified explicitly, not assumed, given the sentinel logic is being reintroduced rather than mechanically reversed.

### Error / Toast Messages

Not applicable.

---

## Story: Re-style Pages and Feature Layouts (Reintroduce Tailwind)

**As a** frontend developer
**I want** every page/feature component's `sx`/`styled()` styling (introduced by `026`) re-authored back as Tailwind utility classes
**So that** the app returns to one consistent Tailwind-based styling system, and MUI (and everything that only exists to support it) can be fully removed

### Screens & Fields

Same ~169-file surface `026` touched, same recommended order (auth/onboarding → Company Settings CRUD → Trip Management → Claim Management), reverted last-in-first-out relative to how `026` rolled forward, or in the same order — either is reasonable, since each feature area's re-styling is independent of the others.

### Flow

1. Each `sx`/`styled()` usage is translated back to Tailwind utility classes, using this app's restored CSS-variable tokens (`bg-background`, `border-border`, `text-muted-foreground`, etc.) — again not a mechanical inverse, since MUI's `theme.spacing()`-driven values and Tailwind's utility scale don't map 1:1 (the same asymmetry `026` flagged in the other direction).
2. `cn()` is reintroduced call-site-by-call-site as each file is converted back.
3. `@mui/material`, `@mui/x-date-pickers`, `@mui/material-nextjs`, `@emotion/react`, `@emotion/styled` are removed from `package.json` only once a grep sweep confirms zero remaining references — same discipline `026` required for Tailwind's own removal.

### Validation Rules

Not applicable.

### Acceptance Criteria

- **Given** any page/component is reverted, **when** compared to its pre-`026` appearance (not its MUI-era appearance), **then** layout/spacing/visual hierarchy match the original shadcn-era design — this is the one place "revert" must mean "back to the real original," not "whatever `026` happened to produce," since `026`'s own re-styling phase explicitly allowed non-pixel-identical results.
- **Given** the final grep sweep for `@mui`/`@emotion`/`sx=`/`styled(` references, **when** it returns zero matches, **then** those packages are removed in the same change.
- **Given** the 4 CRUD listing screens' sort/pagination behavior, **when** reverted to `ui/table.tsx`, **then** it's still in-memory, client-side — unchanged through both migrations.

### Error / Toast Messages

Not applicable.

---

## Story: Storybook Coverage for Every Component

**As a** frontend developer
**I want** every reverted component's story updated back to its shadcn form
**So that** Storybook stays a reliable place to view/iterate on any component, through either direction of this migration

### Screens & Fields

Every story `026` updated to MUI gets updated back to shadcn in the same change that reverts its underlying component — no separate follow-up pass, same discipline `026` itself required.

### Flow

1. Stories stay at `src/stories/components/<PascalCaseName>/<PascalCaseName>.stories.tsx` — no location/naming change either direction.
2. `header.tsx` remains without a story regardless of which library it's on — that gap predates both migrations and isn't solved by either (see `026`'s own Out of Scope).

### Validation Rules

Not applicable.

### Acceptance Criteria

- **Given** `npm run storybook`, **when** run after this reversal, **then** every reverted component's story renders correctly via shadcn/Tailwind, with the same state coverage bar (default, disabled, error, loading, variants) `026` and this codebase's own convention require.
- **Given** `npm run build-storybook`, **when** run, **then** it completes without errors.

### Error / Toast Messages

Not applicable.

---

## API Design

Not applicable — frontend-only, no backend/`ai-service` changes, same as `026`.

## Data Model

Not applicable — no schema changes.

## Validation Rules Summary

Identical rule to `026`, applied in the opposite direction: every validation rule, error message, and toast string must reappear byte-for-byte once reverted to shadcn/`sonner` rendering — only *how* something displays changes, never *what* it says.

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| SHAD-01 | `select-field.tsx`'s "All" option is selected after reverting to Base UI `Select` | `onChange` receives `""` — explicitly verified, since the sentinel-mapping logic is being **reintroduced**, not mechanically restored by symmetry with `026` |
| SHAD-02 | Pick a date via the reverted `date-picker.tsx` (Popover+Calendar) in a non-UTC timezone | Resulting `"YYYY-MM-DD"` string matches the clicked calendar day — same drift risk `026` flagged, now on the reverse conversion boundary |
| SHAD-03 | Open the multi-select eligibility picker after reverting from `Autocomplete` to `DropdownMenuCheckboxItem` | Menu stays open across multiple picks (`closeOnClick={false}`); type-ahead filtering is **lost** compared to the MUI-era `Autocomplete` — confirm this is an accepted regression, not silently unnoticed |
| SHAD-04 | Trigger every distinct toast call site after reverting `useToast()` calls back to `toast.success(...)`/`toast.error(...)` | Exact same message text renders via `sonner`, same severity styling |
| SHAD-05 | Load any page on a hard refresh after removing `AppRouterCacheProvider`/`ThemeProvider` | No SSR/hydration style-flash issues from the CSS-variable-based Tailwind system replacing the emotion-based MUI one |
| SHAD-06 | During the MUI/Tailwind coexistence window mid-reversal, load a page mixing a reverted Tailwind component with a not-yet-reverted `sx`-styled one | No double-reset visual glitches between Tailwind's Preflight and MUI's `CssBaseline`, both active simultaneously — same class of issue `026` flagged, now in reverse |
| SHAD-07 | Open a reverted `Dialog`, tab through it, close it | Focus trapped while open, restored to the trigger on close — re-verified against Base UI's defaults, not assumed identical to MUI's behavior just because `026` already checked MUI's |
| SHAD-08 | Keyboard-only operate a reverted `DropdownMenu` (Profile menu) | Fully keyboard-operable, `aria-expanded` reflects state — same accessibility spot-check `026` required, now against Base UI |
| SHAD-09 | Run the final "is MUI/emotion fully gone" grep sweep (`@mui/`, `@emotion/`, `sx=`, `styled(`) after the layout re-styling story | Zero matches before `package.json` cleanup is considered complete |
| SHAD-10 | Run `tsc --noEmit`, `lint`, `build`, `build-storybook` after each phase | All four pass cleanly at the end of every phase, same bar `026` set |

Same testing-constraint note as `026`: this frontend has no automated test runner — verification here is equally manual (build/lint clean + click-through + Storybook review per phase), not a regression suite.

## Out of Scope

- **Actually performing this reversal** — like `026`, this doc is a spec only, and only relevant *if* `026` is implemented first and a later decision reverses it. It is not an instruction to do anything to the codebase today.
- **Re-litigating `026`'s own Open Questions** (dark mode, brand color, icon library) — if those were decided one way during `026`'s implementation, this reversal doesn't need to reconsider them; it only reverts the component/styling library, not product decisions made in between.
- Same icon-library, automated-testing, and backend/`ai-service` exclusions `026` itself lists.

## Open Questions / Assumptions

- **This doc could drift from reality.** It's written against `026`'s own spec, not against actually-implemented MUI code — if `026`'s implementation deviates from its doc in any way (a different component chosen, a different file structure), this doc's file paths/component names should be re-verified against the real codebase at the time a reversal is actually considered, not assumed accurate from this text alone.
- **The `Autocomplete`→`DropdownMenuCheckboxItem` capability loss** (no more type-ahead filtering on the multi-select eligibility picker) is flagged as a real, accepted regression of reverting, not a neutral swap — worth a specific gut-check before actually reverting, since it's the one place this migration isn't fully symmetric.
- **Whether this doc is ever needed at all** is itself an open question — it exists purely as an insurance policy in case `026` doesn't pan out; if `026` ships and stays, this doc can simply sit unused indefinitely.
