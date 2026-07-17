# 026 - MUI Migration

**Status:** Implemented
**Epic:** MUI Migration

## Overview

Replaces shadcn/ui (Tailwind CSS 4 + Base UI primitives) with **MUI (`@mui/material`) 9.2.0** as the frontend's sole UI component library — confirmed via npm as the real current latest release, not a placeholder version. Where core `@mui/material` doesn't cover something (date/time pickers), an official MUI-ecosystem package is used instead (`@mui/x-date-pickers`) — never shadcn, and never a third, unrelated component library. This is a purely presentational migration: **no existing behavior, validation rule, API call, or user-facing copy changes** — every screen should look and work the same to an end user once this is done, just rendered through a different component/styling stack.

**Scope is bigger than the 14 files in `src/components/ui/`.** An audit of the current frontend found:
- 14 shadcn primitives (`button`, `input`, `label`, `dialog`, `dropdown-menu`, `select`, `popover`, `calendar`, `table`, `switch`, `checkbox`, `textarea`, `spinner`, `sonner`), 8 of them Base UI-backed (`@base-ui/react/*`), the rest either plain HTML wrappers (`label`, `table`, `textarea`), a `react-day-picker` wrapper (`calendar`), a custom Phosphor-icon spinner not really "shadcn" at all (`spinner`), or a themed wrapper around the standalone `sonner` npm package (`sonner`).
- Import counts by primitive scope how disruptive each swap is: Button (78 files), Spinner (65 files), `toast()` from `sonner` (~49 files), Input (46), Label (40), Dialog (25), Switch (8), DropdownMenu (7), Table (6), Checkbox (4), Textarea (3), Select (1, only via the composed `select-field.tsx`), Popover/Calendar (2 each, only via the composed date-picker components).
- Composed components built on top of the primitives (`date-picker.tsx`, `date-time-picker.tsx`, `select-field.tsx`, `password-input.tsx`, `auth-card.tsx`, `logo.tsx`, `header.tsx`) each need their own migration note, since callers depend on their exact external contracts (e.g. plain `"YYYY-MM-DD"` strings, not `Date` objects).
- **The biggest surface by far**: raw Tailwind utility classes are hand-authored directly in layout code across virtually every page and feature component (`claim-row.tsx`, `trip-overview-card.tsx`, every `app/(private)/**/page.tsx`, etc.), not just inside the 14 shadcn files — roughly 169 `.tsx` files exist in this frontend, and the large majority use `className` for their own layout/spacing/color, independent of any shadcn component. Removing shadcn without also re-styling this layout code would leave the app half-migrated and visually broken.

Given that scope, this migration is split into four ordered phases (see the four Stories below), not attempted as one change. **Confirmed decisions** (asked and answered before writing this doc, so implementation isn't blocked re-litigating them):
1. ~~**This doc is the deliverable for now**~~ — **the migration has since actually shipped**: `tailwindcss`/`tailwind-merge`/`clsx`/`class-variance-authority`/`tw-animate-css`/`shadcn`/`@base-ui/react` are no longer dependencies, `globals.css`/`postcss.config.mjs`/`components.json`/`src/lib/utils.ts` no longer exist, and every one of the 14 primitives plus every composed component is MUI-backed (see `frontend/CLAUDE.md`'s own "Styling (MUI)" section, which documents the shipped result in detail). This doc is kept as the historical spec, not re-written into a report, but every claim below that assumed "not built yet" has been corrected in place.
2. **Phased-by-layer rollout**: theme/colors foundation → core primitives → composed components → feature-by-feature page re-styling (the largest, riskiest phase, done last). This is exactly how it shipped.
3. **Toast notifications migrate from `sonner` to MUI's `Snackbar`+`Alert`**, for full visual consistency with the new design system, rather than keeping the standalone `sonner` package restyled to the new palette. Shipped as `ui/toast.tsx`'s `Toaster` — a hand-built pub/sub queue, since MUI has no imperative toast function the way `sonner`'s own `toast.success(...)` was.

---

## Story: Establish the MUI Theme & Colors Foundation

**As a** frontend developer working on this app
**I want** one theme file and one colors file that fully control MUI's visual language
**So that** I can change a color or a spacing/typography default in one place and have it apply everywhere, instead of hunting through Tailwind classes scattered across the codebase

### Screens & Fields

Not a user-facing screen — this story creates the foundational files every later phase builds on.

| Artifact | Path | Purpose |
|----------|------|---------|
| Colors file | `frontend/src/theme/colors.ts` | Plain exported palette-token object — the **one file** a developer edits to add, remove, or change a color. |
| Theme file | `frontend/src/theme/theme.ts` | Calls MUI's `createTheme()`, importing `colors.ts` and mapping it into `palette`, plus `typography`, `shape`, and `components` (style-override) defaults. |
| Theme provider wiring | `frontend/src/app/layout.tsx` | Wires `AppRouterCacheProvider` (from `@mui/material-nextjs`) + MUI's `ThemeProvider` + `CssBaseline`. |
| Storybook decorator | `frontend/.storybook/preview.tsx` | Wraps every story in the same theme via a plain emotion `CacheProvider` + MUI `ThemeProvider`, so components preview themed, not unstyled. |

### Flow

1. `colors.ts` exports a plain object of color tokens grouped by intent — MUI's five built-in palette keys (`primary`, `secondary`, `error`, `warning`, `info`, `success`, each as a `{light, main, dark, contrastText}` shape) plus this app's existing semantic grays (today's `--background`/`--foreground`/`--muted`/`--border`/etc. from `globals.css`) and the ad hoc literal Tailwind colors currently used for status badges/chips (the greens in `claim-status-badge.tsx`/`amount-chip.tsx`, the ambers/reds in `split-request-status-badge.tsx`) — those become first-class named palette entries instead of one-off literal classes repeated per component.
2. `theme.ts` imports `colors.ts` and calls `createTheme({ palette: {...}, typography: {...}, shape: {...}, components: {...} })`. `typography.fontFamily` reuses the already-loaded Montserrat variable (`next/font/google` in `app/layout.tsx` — not reloaded a second way). `shape.borderRadius` carries forward today's `--radius: 0.625rem` token so existing corner-rounding doesn't visually jump. `components` overrides (e.g. `MuiButton.styleOverrides`) become the one place a component-wide default (not just a color) lives, replacing today's scattered `className="rounded-lg ..."` repetition.
3. Any palette key beyond MUI's 5 built-in ones (e.g. a `status` or `chip` custom key for the badge colors above) requires a TypeScript module-augmentation block (`declare module '@mui/material/styles' { interface Palette { ... } }`) so `theme.palette.status.pending` etc. type-checks — this is MUI's own documented mechanism for extending the palette, not a workaround.
4. `app/layout.tsx` wraps the app in `AppRouterCacheProvider` (MUI's official Next.js App Router emotion-cache adapter — **required** to avoid a flash-of-unstyled-content / hydration mismatch on first paint; this is a well-known integration requirement, not an optional nicety) → `ThemeProvider theme={theme}` → `CssBaseline` (MUI's browser-default reset, analogous to Tailwind's Preflight) → the rest of the app.
5. During the coexistence window (Phases 2–3, before Tailwind is removed), both `CssBaseline` and Tailwind's Preflight are active simultaneously — see [Test Cases](#test-cases) for how this is handled without double-resetting styles unpredictably.
6. `.storybook/preview.tsx` gets an equivalent (but Next-agnostic) decorator: a plain emotion `CacheProvider` + the same `ThemeProvider`/`theme.ts`, so every story renders with real theme values rather than browser defaults — this closes a currently-latent gap (today's shadcn-based stories rely on `globals.css`'s CSS variables being globally available, which happens to work without an explicit decorator; MUI's `sx`/theme values do not work that way and need the provider explicitly).

### Validation Rules

Not applicable — no user-submitted data; this story is a styling/architecture foundation only.

### Acceptance Criteria

- **Given** the theme foundation is in place, **when** a developer changes a value in `colors.ts` (e.g. `primary.main`), **then** every MUI component across the app that uses `primary` reflects the new color without any other file needing an edit.
- **Given** a developer wants to add a brand-new semantic color (e.g. a new status badge color), **when** they add a key to `colors.ts` and its corresponding palette-interface augmentation, **then** `theme.palette.<newKey>` is available and type-safe everywhere in the app.
- **Given** `AppRouterCacheProvider`/`ThemeProvider`/`CssBaseline` are wired into `app/layout.tsx`, **when** any page first loads (including a hard refresh, not just client navigation), **then** there is no visible flash of unstyled MUI content before the theme applies.
- **Given** a Storybook story for any MUI-based component, **when** it's opened in the Storybook UI, **then** it renders fully themed (correct colors/typography/spacing), not browser-default styling.

### Error / Toast Messages

Not applicable — no user-facing errors in this story.

---

## Story: Migrate Core Primitives to MUI

**As a** frontend developer
**I want** every shadcn primitive replaced by its MUI (or MUI-ecosystem) equivalent, with the exact same external behavior
**So that** every component built on top of these primitives keeps working without its own callers changing

### Screens & Fields

Not a user-facing screen — a 1:1 (or 1:many, where MUI's shape differs) replacement mapping.

| Current (shadcn/`ui/`) | Replacement | Notes |
|---|---|---|
| `button.tsx` (`Button`, `buttonVariants`) | MUI `Button` | Variant mapping: `default`→`contained`, `outline`→`outlined`, `secondary`→`contained` (secondary color), `ghost`/`link`→`text`, `destructive`→`contained`/`outlined` with `color="error"`. |
| `input.tsx` (`Input`) | MUI `TextField` | `TextField` bundles input + label + helper/error text in one component — see the Label row below for what this simplifies away. |
| `label.tsx` (`Label`) | `TextField`'s built-in `label` prop, or bare `FormLabel`/`InputLabel` where a label genuinely isn't attached to a single `TextField` (e.g. a section heading above a radio group) | Most of today's 40 `Label` call sites collapse into `TextField`'s own prop rather than needing a separate component at all. |
| `dialog.tsx` (`Dialog` family) | MUI `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions` | MUI's `DialogActions` replaces today's `DialogFooter`; focus-trap/restore-on-close is a built-in MUI behavior (see [Test Cases](#test-cases) for the parity check against this app's Accessibility Minimums). |
| `dropdown-menu.tsx` (`DropdownMenu` family) | MUI `Menu`, `MenuItem` | ~~The existing checkbox multi-select pattern maps onto MUI's own `Autocomplete` with checkboxes, `disableCloseOnSelect` recipe — a clean upgrade~~ **not what shipped**: the `Autocomplete`-with-checkboxes upgrade was never pursued. `dropdown-menu.tsx` keeps `DropdownMenuCheckboxItem`/`closeOnClick={false}`, just backed by MUI `Menu` underneath instead of Base UI — `policy-eligibility-section.tsx` and every other genuine multi-select still build on it (see `frontend/CLAUDE.md`'s own note that this is the one deliberate exception to "searchable pickers use `Select`/`Autocomplete`"). No free type-ahead filtering was added as part of this migration. |
| `select.tsx` (`Select` family) | MUI `Select` | Only 1 direct call site today (`select-field.tsx`) — see the composed-components story below for what changes there. |
| `popover.tsx` + `calendar.tsx` | `@mui/x-date-pickers`' `DatePicker`/`DateTimePicker` directly | Not a like-for-like primitive swap — MUI's date pickers are a complete, self-contained component (trigger + popover + calendar grid in one), so the composed `date-picker.tsx`/`date-time-picker.tsx` wrappers become much thinner (see next story). Needs `AdapterDateFns` (`date-fns` is already a dependency) wired via `LocalizationProvider`. |
| `table.tsx` (`Table` family) | MUI `Table`, `TableContainer`, `TableHead`, `TableBody`, `TableRow`, `TableCell`, `TableSortLabel` | `TableSortLabel` replaces today's hand-rolled sortable-column-header markup in the 4 CRUD listing screens (Grades/Departments/Employees/Roles-Privileges) that use `Table`. |
| `switch.tsx` (`Switch`) | MUI `Switch` | Direct swap. |
| `checkbox.tsx` (`Checkbox`) | MUI `Checkbox` | Direct swap. |
| `textarea.tsx` (`Textarea`) | MUI `TextField` with `multiline` (+ `rows`/`minRows`) | Collapses into the same component as plain text inputs, per MUI's own convention. |
| `spinner.tsx` (`Spinner`) | MUI `CircularProgress` | Direct swap; today's custom Phosphor-icon spinner is replaced outright, not kept alongside. |
| `sonner.tsx` (`Toaster`) + the `sonner` package's `toast()` (~49 call sites) | MUI `Snackbar` + `Alert`, plus a small app-level `useToast()`/`ToastProvider` helper (new, since MUI has no built-in global "fire and forget" toast function the way `sonner`'s `toast.success()` does) | The **only** primitive replacement in this table that needs a new small piece of app-level infrastructure (a queue/context), since MUI intentionally leaves "one Snackbar at a time, imperatively triggered" up to the app rather than shipping a toast-queue library. Every existing `toast.success(...)`/`toast.error(...)` call site is updated to call this new helper instead — same call shape, different implementation underneath. |

### Flow

1. Each primitive is replaced one at a time, in isolation, verified against its Storybook story (existing or newly added — see the Storybook story below) before moving to the next.
2. Composed components and feature code are **not** touched in this phase except where a primitive's prop shape genuinely can't be preserved without a call-site change (expected to be rare — most of MUI's props are similar enough in spirit, e.g. `open`/`onOpenChange` on Dialog vs. MUI's `open`/`onClose`).
3. Both the old shadcn primitive and its MUI replacement may temporarily coexist file-by-file during this phase (e.g. `ui/button.tsx` migrated while `ui/table.tsx` hasn't been yet) — this is expected and fine, since each primitive's call sites are updated together with it, not left half-migrated mid-primitive.

### Validation Rules

Not applicable — no new validation logic; every existing validation rule (required fields, length limits, regex patterns) stays exactly as-is, just rendered through a `TextField`'s `error`/`helperText` props instead of a shadcn `Input` + separately-rendered error `<p>`.

### Acceptance Criteria

- **Given** any primitive is migrated, **when** every existing caller of it is updated, **then** the app's build (`tsc`, `next build`, `eslint`) is clean and every feature that used that primitive behaves identically to before (same validation messages, same disabled/loading states, same click/keyboard behavior).
- **Given** the toast migration specifically, **when** any existing `toast.success(...)`/`toast.error(...)` call fires, **then** the exact same message text appears, styled via `Alert`'s `severity="success"`/`"error"` inside a `Snackbar`, auto-dismissing on the same rough timing users are used to today.
- **Given** the multi-select eligibility picker specifically, **when** a user selects several entities, **then** the menu stays open across multiple picks (matching today's `closeOnClick={false}` behavior) and closes only on an explicit dismiss.

### Error / Toast Messages

Not applicable — no new messages; every existing message string is preserved verbatim (see [Validation Rules Summary](#validation-rules-summary)).

---

## Story: Migrate Composed & Feature Components

**As a** frontend developer
**I want** this app's own composed components (built on top of the primitives above) to keep their exact external contracts while their internals move to MUI
**So that** every page/form that already uses `DatePicker`, `SelectField`, etc. needs zero changes, even though the component's insides are completely different

### Screens & Fields

| Component | Current external contract | What changes internally |
|---|---|---|
| `date-picker.tsx` (`DatePicker`) | `value`/`onChange` as plain `"YYYY-MM-DD"` strings | Internals swap to `@mui/x-date-pickers`' `DatePicker`, converting string↔`Date` at the component's own boundary — callers never see a `Date` object, exactly as today. |
| `date-time-picker.tsx` (`DateTimePicker`) | `value`/`onChange` as plain `"YYYY-MM-DDTHH:mm"` strings | Same string↔`Date` boundary conversion, using `@mui/x-date-pickers`' `DateTimePicker` instead of a hand-composed Popover+Calendar+time-`Input`. |
| `select-field.tsx` (`SelectField`) | Plain string `value`/`onChange`, `""` valid for an "All"-style option | Internals swap to MUI `Select`, which — unlike Base UI's — allows an empty-string `value` **natively**. This means the private `EMPTY_VALUE_SENTINEL` workaround this component currently needs can be **deleted outright**, not just hidden behind the same interface — a genuine simplification, not just a swap (see [Test Cases](#test-cases) for what to double-check before relying on that). |
| `password-input.tsx` (`PasswordInput`) | `TextField` + a show/hide toggle icon | Swaps to MUI `TextField` with an `InputAdornment`/`IconButton` toggle (Phosphor's `EyeIcon`/`EyeSlashIcon` kept as-is — see [Overview](#overview) on icons staying Phosphor). |
| `header.tsx` (`Header`) | Company Settings sub-header (plain `Link`s) + Profile `DropdownMenu` | The Profile menu swaps to MUI `Menu`; the Company Settings sub-header (already plain `Link`s, not a shadcn component) is restyled via `sx`/`Box` in the layout phase below, not this one. |
| `auth-card.tsx` / `logo.tsx` | Layout wrappers, no shadcn primitive dependency today | Restyled via `sx`/`Box`/`Typography` in the layout phase below — listed here only because they're composed, reusable components, not because they use a primitive being swapped in this story. |

### Flow

1. Each composed component's **public API is treated as frozen** going into this story — the whole point is that every existing call site across the app (dozens of forms/filters) needs zero changes.
2. `date-picker.tsx`/`date-time-picker.tsx`: the string↔`Date` conversion functions already conceptually exist at the edge of today's implementation (since the underlying `Calendar`/native input already operate on `Date`/string respectively) — this story's job is making sure that conversion boundary is preserved exactly, including timezone handling (today's implementation treats dates as local-midnight, not UTC-midnight; this must not silently shift by a day for any user in a non-UTC timezone).
3. `select-field.tsx`: once confirmed no caller ever relied on the sentinel value leaking through (it shouldn't have — it's private to the component), the sentinel-mapping code is deleted, not just bypassed.
4. `header.tsx`: since it has no Storybook story today (documented, pre-existing gap — it needs Next-router mocking that `@storybook/react-vite` doesn't ship out of the box), this story does **not** attempt to solve that mocking problem as a side effect — it's called out again in [Out of Scope](#out-of-scope), same as it was when first flagged.

### Validation Rules

Not applicable beyond what's already covered per-field elsewhere (date format validity, select option membership) — unchanged.

### Acceptance Criteria

- **Given** any page using `DatePicker`/`DateTimePicker`, **when** a date is picked, **then** the exact same string format is written into that page's own state as before, with no timezone drift.
- **Given** any page using `SelectField` with an "All" option, **when** "All" is selected, **then** the component's `onChange` still receives `""`, identically to today, with no caller-visible change.
- **Given** the Profile menu in `header.tsx`, **when** a user opens it, **then** it shows the same items (identity display, View Profile, Logout) in the same order, operable by keyboard exactly as before.

### Error / Toast Messages

Not applicable — no new messages.

---

## Story: Re-style Pages and Feature Layouts (Remove Tailwind)

**As a** frontend developer
**I want** every page and feature component's own layout/spacing/color code re-authored via MUI's `sx` prop / `styled()` instead of raw Tailwind classes
**So that** the app has one consistent styling system end-to-end, and Tailwind (and everything that only exists to support it) can be fully removed

### Screens & Fields

Not a single screen — this is every page under `src/app/(public)/` and `src/app/(private)/`, plus every feature component under `src/components/{category,claim,department,employee,employee-invite,grade,profile,role,trip}/` that authors its own Tailwind classes today (card layouts, row layouts, filter rails, section wrappers). Recommended order (matches how the app itself is organized, and roughly ascending in size/risk):

1. Auth/onboarding (`login`, `register/*`, `forgot-password/*`, `onboarding/*`) — smallest, most self-contained pages.
2. Company Settings CRUD screens (Grades/Departments/Roles-Privileges/Employees/Associated Organizations/Categories) — most uniform/templated, so patterns established here (e.g. the `Table`+`TableSortLabel` shape) get reused, not reinvented, in later phases.
3. Trip Management (`trips/*`).
4. Claim Management (`claims/*`) — the largest, most recently-touched surface (including everything from `025`'s Split Claim work), done last so the patterns from phases 1–3 are already proven.

### Flow

1. Each feature area's pages/components are re-styled using `sx` (for one-off styling) and/or `styled()` (for a pattern reused several times within that feature, e.g. a card wrapper repeated across every row component) — not a mechanical "replace `className` string with an equivalent `sx` object" pass, since Tailwind's utility-class model and MUI's theme-aware `sx` model don't map 1:1 (e.g. `gap-3` → `theme.spacing(1.5)`-driven `gap`, `text-muted-foreground` → `theme.palette.text.secondary` or a custom palette key from [the colors file](#story-establish-the-mui-theme--colors-foundation)).
2. `cn()` (`src/lib/utils.ts`) has no purpose once Tailwind classes are gone from a file — call sites drop it as they're migrated; the helper itself (and `clsx`/`tailwind-merge` as dependencies) is deleted only once **zero** files reference it, confirmed via a grep sweep at the end of this phase, not assumed partway through.
3. `globals.css`'s Tailwind-specific blocks (`@import "tailwindcss"`, `@theme inline`, the `:root`/`.dark` CSS-variable blocks, the `@layer base` reset) are removed once MUI's `CssBaseline` + `theme.ts` fully own resets/tokens — this is the point where the CSS-reset coexistence question from [Test Cases](#test-cases) resolves itself, since only one reset (`CssBaseline`) remains.
4. `tailwindcss`, `@tailwindcss/postcss`, `tailwind-merge`, `clsx` (if nothing else in the app uses it independent of `cn()` — confirmed via the same grep sweep), `tw-animate-css`, and the `shadcn` CLI devDependency are removed from `package.json` in the same final step, once the grep sweep in point 2 confirms nothing references them.

### Validation Rules

Not applicable.

### Acceptance Criteria

- **Given** any page/component is re-styled, **when** compared side-by-side with its pre-migration appearance, **then** the layout, spacing, and visual hierarchy are equivalent (not necessarily pixel-identical, since MUI's own spacing/typography scale differs slightly from Tailwind's, but no functional regression — no overlapping elements, no broken responsive behavior at the breakpoints this app already supports).
- **Given** the final grep sweep for Tailwind/`cn()`/`clsx`/`tailwind-merge` references, **when** it returns zero matches, **then** those packages and `globals.css`'s Tailwind blocks are removed in the same change — not left in "just in case."
- **Given** the 4 CRUD listing screens' in-memory sort/pagination behavior (Grades/Departments/Employees/Roles-Privileges), **when** re-styled with `Table`/`TableSortLabel`, **then** sorting/pagination still happens client-side against the already-fetched result set, exactly as today — this phase must not accidentally change that to (or from) a server-side paginated/sorted query.

### Error / Toast Messages

Not applicable.

---

## Story: Storybook Coverage for Every Component

**As a** frontend developer
**I want** every MUI-based component — primitive or composed — to have a Storybook story
**So that** I can view and iterate on any component in isolation without navigating to the specific app page that happens to render it

### Screens & Fields

| Component | Story status today | Action |
|---|---|---|
| `Button`, `Checkbox`, `Dialog`, `DropdownMenu`→`Menu`, `Input`→`TextField`, `Label`, `Spinner`→`CircularProgress`, `Switch`, `Table`, `Toaster`→`Snackbar`/`Alert` | Has a story today (shadcn version) | Update the existing story in place to render the new MUI component — same story file location, same "meaningful states covered" bar this codebase already holds itself to. |
| `Calendar`/`Popover`/`Select` (removed as standalone primitives — folded entirely into `DatePicker`/`DateTimePicker`/`SelectField`, which have their own stories in the row below), `Textarea`→`TextField` (`multiline`) | **No story today** (pre-existing gap) | `Textarea`/`TextField` got its story as part of this migration. `Calendar`/`Popover`/`Select` don't apply as their own row anymore — there's no standalone component left to give one to, since none of the three survived as independent primitives post-migration. |
| `DatePicker`, `DateTimePicker`, `SelectField` (composed components) | **No story today** (pre-existing gap) | New story added — these are exactly the kind of "genuinely shared/reusable component" this codebase's own Storybook convention says should have one. |
| `AuthCard`, `ComingSoon`, `Logo`, `PasswordInput` | Has a story today | Confirmed still accurate post-restyle; updated only if their own internals changed (e.g. `PasswordInput`). |
| `Header` | **No story today**, documented as blocked on Next-router mocking | Still blocked — not solved by this migration (see [Out of Scope](#out-of-scope)); listed here only so it isn't silently forgotten. |

### Flow

1. Every story lives at `src/stories/components/<PascalCaseName>/<PascalCaseName>.stories.tsx`, matching this app's existing convention exactly — no new location or naming scheme introduced.
2. Each story is wrapped by the new theme decorator from [the first story above](#story-establish-the-mui-theme--colors-foundation), so opening any story in Storybook's UI shows it correctly themed, not browser-default.
3. As each primitive/composed component is migrated (per the two stories above), its story is updated in the same change — not as a separate follow-up pass — so the app is never left with a stale, shadcn-flavored story sitting next to an already-migrated MUI component.

### Validation Rules

Not applicable.

### Acceptance Criteria

- **Given** any component this migration touches, **when** `npm run storybook` is run, **then** that component has a story covering at minimum its default state plus any meaningfully distinct state it supports today (disabled, error, loading, multiple variants) — matching the bar this codebase's own convention already sets, not a lower one introduced for this migration.
- **Given** `npm run build-storybook`, **when** it runs, **then** it completes without errors, the same verification this codebase already expects for every Storybook change.

### Error / Toast Messages

Not applicable.

---

## API Design

Not applicable — this is a frontend-only, presentation-layer migration. No backend endpoint, request/response shape, or contract changes anywhere; the `backend` and `ai-service` projects are entirely untouched by this epic.

## Data Model

Not applicable — no database schema changes. No `Employee`/`Claim`/`Category`/etc. table is touched.

## Validation Rules Summary

No new validation rules are introduced anywhere in this epic. The one rule that spans every story above: **every existing validation rule, error message, and toast message string must reappear byte-for-byte** in its MUI-rendered form — this migration changes *how* a message is displayed (e.g. `TextField`'s `helperText`/`error` props instead of a shadcn `Input` plus a separately-rendered error paragraph, or an `Alert` inside a `Snackbar` instead of a `sonner` toast), never *what* it says.

## Test Cases

| ID | Scenario | Expected Result |
|----|----------|------------------|
| MUI-01 | `select-field.tsx`'s "All" option is selected after migrating to MUI `Select` | `onChange` still receives `""`, identical to today — confirms the sentinel-removal simplification didn't change the external contract |
| MUI-02 | Pick a date via the migrated `DatePicker` in a timezone other than UTC (e.g. UTC-8) | The resulting `"YYYY-MM-DD"` string matches the calendar day the user actually clicked — no off-by-one-day drift from a UTC/local conversion bug |
| MUI-03 | Pick a date-time via `DateTimePicker` at a value close to local midnight | The resulting `"YYYY-MM-DDTHH:mm"` string is exactly what was displayed in the picker, not shifted by a timezone conversion |
| MUI-04 | Open the multi-select eligibility picker (`policy-eligibility-section.tsx`), select 3 entities in a row | Menu/`Autocomplete` stays open across all 3 picks, matching today's `closeOnClick={false}` behavior, closing only on explicit dismiss |
| MUI-05 | Trigger every distinct `toast.success(...)`/`toast.error(...)` call site at least once across the app (a representative sample covering auth, category, trip, claim, employee flows) | Exact same message text appears via the new `Snackbar`+`Alert`, with the same rough severity styling (success=green, error=red) |
| MUI-06 | Load any page on a hard refresh (not client-side navigation) with the new theme wired in | No visible flash of unstyled/default-MUI content before the theme's colors/typography apply |
| MUI-07 | During the Tailwind/MUI coexistence window (Phases 2–3), load a page that mixes an already-migrated MUI component with a not-yet-migrated Tailwind-styled one | No double-reset visual glitches (unexpected margin/font/color resets) from `CssBaseline` and Tailwind's Preflight both being active |
| MUI-08 | Open a `Dialog` (any migrated dialog, e.g. a delete-confirmation dialog), tab through its contents, then close it | Focus is trapped inside the dialog while open and restored to the triggering element on close — matching this app's own Accessibility Minimums (global `CLAUDE.md`), verified against MUI's default behavior rather than assumed |
| MUI-09 | Open a migrated `Menu` (e.g. the Profile menu) via keyboard only (Tab to it, Enter/Space to open, arrow keys to navigate, Escape to close) | Fully keyboard-operable, `aria-expanded` reflects open/closed state — spot-checked against MUI's defaults since Base UI and MUI aren't guaranteed to match exactly out of the box |
| MUI-10 | Render a component using a Phosphor icon inside a migrated MUI slot (`Button`'s `startIcon`, `TextField`'s `InputAdornment`, `IconButton`) | Icon renders at the correct visual size — this codebase already passes an explicit `size` prop to every Phosphor icon, so it should not fall back to any MUI default-icon-size assumption; spot-check anyway |
| MUI-11 | Sort/paginate the Grades, Departments, Employees, and Roles-Privileges listing screens after their `Table` migration | Sorting/pagination still happens in-memory against the already-fetched result set — must not silently become (or stop being) a server-side query as a side effect of the `Table`→`TableSortLabel` swap |
| MUI-12 | Run the final "is Tailwind fully gone" grep sweep (`className` with Tailwind utility patterns, `cn(`, `clsx`, `tailwind-merge`, `tw-animate-css`) after Phase 4 | Zero matches before `package.json`/`globals.css` cleanup is considered complete |
| MUI-13 | Run `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run build-storybook` after each phase | All four commands pass cleanly at the end of every phase, not just at the very end of the whole migration — matching this codebase's own established verification bar for every prior story |

**A note on test coverage overall**: this frontend has **no automated test runner configured** (confirmed — no Jest/Vitest/Playwright config anywhere in `frontend/`). "Functionality must not break" is therefore verified manually per phase — `tsc`/lint/build clean, plus a feature-by-feature click-through and Storybook visual review — not via an automated regression suite. This is a real, pre-existing constraint of this codebase, not something introduced by this migration, and it's stated explicitly here so the verification plan doesn't silently imply a safety net that doesn't exist.

## Out of Scope

- **Actually performing the migration** — this doc is the spec; implementation is a separate, later effort (see [Overview](#overview)'s confirmed decision #1).
- **Changing the icon library.** `@phosphor-icons/react` stays — MUI accepts any React node in its icon slots, so there's no forced reason to adopt `@mui/icons-material` (see [Open Questions](#open-questions--assumptions)).
- **Introducing automated visual regression or end-to-end testing.** None exists today; adding one is a legitimate future improvement but isn't part of this ask.
- **Solving `header.tsx`'s pre-existing missing-story gap** (blocked on Next-router mocking under `@storybook/react-vite`) — not caused by, and not solved by, this migration.
- **Changing any backend or `ai-service` code.** This is entirely a `frontend/` change.
- **Redesigning the app's visual identity/brand** beyond what's needed to carry today's (grayscale, no-distinct-brand-color) look forward faithfully — see the brand-color Open Question below for why this is called out explicitly rather than assumed.
- **Reviving dark mode.** Today's `globals.css` defines a full `.dark` token set, but it's unused dead code (no `ThemeProvider`/toggle wires it up anywhere) — this migration is not obligated to preserve dark-mode capability unless separately asked for (see Open Questions).

## Open Questions / Assumptions

- **Dark mode**: `globals.css` defines a complete light/dark oklch token set, but grepping `next-themes`/`useTheme`/`ThemeProvider` across the whole frontend found it referenced only inside `ui/sonner.tsx` itself — no `ThemeProvider` is mounted anywhere (not even `app/layout.tsx`), and no toggle UI exists. **Assumed**: dark mode is *not* a requirement to carry forward into the new MUI theme, since it's effectively unused today. Flagged explicitly because it would be easy to assume the opposite just from `globals.css`'s CSS alone.
- **Icon library**: assumed **Phosphor stays**, not replaced by `@mui/icons-material` — MUI doesn't require its own icon set, and introducing a second icon dependency alongside Phosphor wasn't asked for.
- **Brand color**: today's entire palette is pure grayscale (every oklch token has zero chroma) — there is no distinct brand/primary color anywhere in the current app. Introducing a real theme system is a natural moment to ask whether the organization wants an actual brand color now, rather than carrying grayscale forward by default. **Not assumed either way here** — this is a real product decision worth a follow-up conversation before or during the theme-foundation phase, not something this doc decides unilaterally.
- **Toast auto-dismiss timing**: `sonner`'s default auto-dismiss duration and MUI `Snackbar`'s default (`autoHideDuration`) aren't guaranteed to match exactly — assumed close enough not to need pixel/millisecond-exact parity, but worth a quick user-facing sanity check during implementation rather than assuming blindly.
- **MUI's exact spacing/typography scale vs. Tailwind's**: acceptance criteria above call for "equivalent, not necessarily pixel-identical" layout — a genuinely 1:1 pixel-perfect re-creation of every Tailwind spacing value in MUI's own 8px-based spacing scale isn't a realistic or valuable goal; reasonable visual-equivalence judgment during implementation is expected, not an exact numeric mapping table for every single `className` that existed before.
