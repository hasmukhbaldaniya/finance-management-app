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

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply (TypeScript strictness, React prop conventions, accessibility, security). See root `CLAUDE.md` for repo-wide context.
