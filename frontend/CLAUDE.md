@AGENTS.md

## Overview

Next.js (App Router, TypeScript, `src/` directory, import alias `@/*`), styled with Tailwind CSS 4 + shadcn/ui. Early-stage skeleton — default `create-next-app` home page still in place, one shadcn component installed (`button.tsx`).

## Common Commands

```
npm run dev                   # next dev
npm run build                 # next build
npm run lint                  # eslint
```
No test runner is configured yet.

## Architecture

App Router pages/layouts live in `src/app`. shadcn/ui components are copied (not npm-installed) into `src/components/ui` — currently just `button.tsx` — and the class-merging helper `cn()` lives in `src/lib/utils.ts`. `components.json` controls the shadcn style/aliases (`base-nova` style, `@/components`, `@/lib`, `@/hooks`); use `npx shadcn add <component>` (or the `shadcn` MCP server configured in the root `.mcp.json`) to add new components rather than hand-rolling primitives, to stay consistent with what's already installed.

Icons: `@phosphor-icons/react` (use the `*Icon`-suffixed exports, e.g. `EyeIcon` — the unsuffixed names are deprecated). Do not add `lucide-react` — it was removed in favor of Phosphor.

Fonts: `Montserrat` loaded via `next/font/google` in `src/app/layout.tsx`, exposed as the `--font-sans` CSS variable (wired to Tailwind's `font-sans` in `globals.css`). `Geist_Mono` remains for monospace (`--font-geist-mono` → `--font-mono`). Add fonts through `next/font/google`, not a manual `<style>`/`@import` tag — it self-hosts and avoids layout shift.

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply (TypeScript strictness, React prop conventions, accessibility, security). See root `CLAUDE.md` for repo-wide context.
