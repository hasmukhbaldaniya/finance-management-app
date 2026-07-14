# UI Library Migration Playbook (Tailwind/shadcn → MUI)

This playbook documents the approach used to migrate the `frontend/` app off Tailwind CSS 4 + shadcn/ui onto MUI (Material UI), as specified in `user-stories/026-mui-migration.md`. It's written to be reusable for any future large-scale UI library migration, not just this one.

## Core Principle

**Preserve every external contract exactly.** Every component keeps its exact prop API, validation, behavior, and copy — only the internals and styling change. Callers should need zero changes. This is what makes a huge migration safe to do incrementally instead of as one giant risky rewrite.

## Phase 1 — Foundation (do this once, first)

1. Install the new library + its ecosystem packages (date pickers, SSR cache adapter, etc.).
2. Create a **single colors file** (e.g. `theme/colors.ts`) — every raw color value lives here, nothing hardcoded elsewhere.
3. Create a **single theme file** (e.g. `theme/theme.ts`) that reads from `colors.ts` and sets typography, spacing, and component-level defaults.
4. Wire the theme into the app root via a dedicated Client Component wrapper (e.g. `ThemeRegistry`) — don't pass the theme object as a prop from a Server Component, it breaks (functions can't cross that boundary during static prerendering).
5. Add the same theme wiring to Storybook's preview config so stories render correctly too.

## Phase 2 — Core Primitives

Convert the shared `ui/` primitives one at a time (Button, Input, Dialog, DropdownMenu, Table, etc.), each as a **thin wrapper** that keeps the old component name and prop shape but renders the new library underneath. This is what lets every other file in the app keep working unchanged while you migrate them later.

## Phase 3 — Composed Components

Convert the components built on top of primitives (date pickers, select fields, cards, etc.) — same rule: external prop API stays identical, internals get rebuilt.

## Phase 4 — Feature Areas + Final Cleanup

This is the bulk of the work. Go **one feature area at a time** (e.g. Category Management, then Trips, then Claims):

1. List every component and page in that area.
2. Convert components first (bottom-up), then the pages that use them.
3. After each small batch: run typecheck → lint → full build. Don't batch too much before checking — errors compound fast otherwise.
4. Commit each logical batch separately with a clear message.
5. Only after **all** feature areas are converted: grep the whole repo for the old library's telltale patterns (class names, helper functions) to catch anything missed.
6. Delete the old library's config files, remove its npm packages, and update the project's own docs (e.g. `CLAUDE.md`) to describe the new system.

## Rules That Saved the Most Time

- **Generalize a primitive the moment two files need the same workaround**, instead of hacking each call site individually (e.g. adding a `matchTriggerWidth` option to one dropdown component instead of re-solving "match popup width to trigger" five times).
- **Grep for the old system's markers before declaring done** — don't trust that earlier "completed" phases actually caught everything. Already-"done" pages can still have leftover components that were missed.
- **Never guess a component's props are unused** — grep every call site before changing a shared component's API.
- **Verify with a real build, not just the type checker** — some breakages (like passing a theme object across a Server/Client boundary) only show up at build time.

## Checklist Template

Use this as a per-feature-area checklist:

- [ ] List all components + pages in the area
- [ ] Convert components (bottom-up)
- [ ] Convert pages
- [ ] `tsc --noEmit` clean
- [ ] `lint` clean
- [ ] Full production build succeeds
- [ ] Commit with a clear message

Final cleanup checklist (once every area is done):

- [ ] Repo-wide grep for old library's class-name/helper patterns — zero real hits
- [ ] Remove old library's config files (e.g. `postcss.config.mjs`, CLI config)
- [ ] Uninstall old library's npm packages
- [ ] Update project docs (`CLAUDE.md`) to describe the new styling system
- [ ] Final full build + Storybook build to confirm
