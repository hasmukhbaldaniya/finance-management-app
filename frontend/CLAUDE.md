@AGENTS.md

## Overview

Next.js (App Router, TypeScript, `src/` directory, import alias `@/*`), styled with Tailwind CSS 4 + shadcn/ui. Currently implements the full authentication flow (login, forgot password, session/route protection) per `user-stories/001-authentication.md`. Structure is modeled on `zp-frontend`'s conventions (see `../../nextjs/zp-frontend/CLAUDE.md`), scaled down to what this app actually has — folders aren't pre-created until there's real content for them.

## Common Commands

```
npm run dev                   # next dev
npm run build                 # next build
npm run lint                  # eslint
npm run storybook             # storybook dev on :6006
npm run build-storybook       # storybook build -> storybook-static/
```
No test runner is configured yet.

## Project Structure

```
src/
├── apis/                # API layer — one subfolder per domain (currently: auth/)
├── app/                 # Next.js App Router routes, split into (public)/(private) groups
├── components/          # Feature/shared components + shadcn primitives (ui/)
├── contexts/            # React context providers, one <Name>Context/ folder each
├── stories/             # Storybook stories for components that aren't shadcn primitives
├── types/               # TypeScript types per domain
└── utils/               # constants/, helpers/, apiManager/
```
No `src/hooks/` or `src/icons/` yet — not created until there's a real shared hook or icon component to put in them (see `zp-frontend/CLAUDE.md`'s own layer descriptions for what each is for when that day comes).

### `src/apis/` — API layer

One subfolder per domain, one file per endpoint: `src/apis/auth/{login,logout,me,requestOtp,verifyOtp,resetPassword}.api.ts`, each just calling `apiCall` from `src/utils/apiManager/apiManager.ts` and returning its typed response. Every domain folder has an `index.ts` barrel; import from the domain barrel (`@/apis/auth`), not individual `.api.ts` files, outside the domain itself. No query-key layer yet — this project doesn't use a data-fetching/cache library (no React Query), so there's nothing to key. If one gets added later, add `src/apis/queryKeys/<domain>.queryKeys.ts` to match `zp-frontend`'s convention at that point.

### `src/app/` — Routes

Two route groups (groups don't affect the URL — `/login` and `/dashboard` are unchanged):
- `src/app/(public)/` — unauthenticated screens (`login/`, `forgot-password/` and its steps). No route protection.
- `src/app/(private)/` — authenticated screens (`dashboard/`). Gated by `src/proxy.ts`'s `matcher`; any new authenticated route must be added under `(private)/` **and** to that matcher array.

Route paths are centralized in `src/utils/constants/route.constant.ts` (`ROUTES` object) — never hardcode a path in `href`, `router.push`/`replace`, or a `new URL(...)` call.

Route protection: `src/proxy.ts` (Next 16 renamed Middleware to Proxy; it defaults to the Node.js runtime, not Edge) verifies the session JWT itself via `jsonwebtoken` before allowing access to matched routes — it doesn't just check cookie presence. `AUTH_COOKIE_NAME` and `JWT_SECRET` env vars must match the backend's exactly (see `.env.example`); a mismatch fails safe (redirect to `/login`) but locks out every user if only one side is updated.

### `src/components/` — Components

- `src/components/ui/` — shadcn/ui primitives, copied (not npm-installed) via `npx shadcn add <component>` (or the `shadcn` MCP server in the root `.mcp.json`). Kebab-case filenames — this is shadcn's own convention, don't rename to fight the tool's update path. Each primitive that's actually used gets a colocated `<name>.stories.tsx` next to it (e.g. `button.tsx` + `button.stories.tsx`) rather than moving the story into `src/stories/` — keeps the shadcn-managed file and its story updating together.
- Everything else shared across features (`auth-card.tsx`, `password-input.tsx`, `logo.tsx`) lives flat in `src/components/` for now — kebab-case filenames, not `zp-frontend`'s `PascalCase/<Name>.component.tsx`. That convention makes sense at `zp-frontend`'s scale (dozens of feature domains, each with its own component folder); with a handful of components and one feature area (auth), a `<FeatureName>/` folder per component would be pure ceremony. Revisit if/when a feature area grows enough components to need its own folder (mirroring `zp-frontend`'s `Auth/`, `Trips/`, etc.).
- Their stories live under `src/stories/components/<PascalCaseName>/<PascalCaseName>.stories.tsx` (e.g. `src/stories/components/AuthCard/AuthCard.stories.tsx`) — required for every genuinely shared/reusable component (not one-off page-specific markup), covering its meaningful states, not just a bare `Default` export.

### `src/contexts/` — Context providers

`<Name>Context/` folder per context, split into `context.ts` (the `createContext` call + its type), `provider.tsx` (the `<Name>Provider` component), `consumer.ts` (the `use<Name>` hook), `index.ts` (barrel). See `src/contexts/ForgotPasswordContext/` — only context so far, scoped to the forgot-password wizard's 3-step state.

### `src/types/` — Types

One file per domain: `<Domain>.type.ts`. `src/types/auth.type.ts` holds `AuthUser`. Don't define shared types inline in components/API files.

### `src/utils/` — Utilities

```
src/utils/
├── apiManager/
│   └── apiManager.ts       # fetch wrapper (apiCall), ApiError, credentials handling
├── constants/
│   ├── route.constant.ts   # ROUTES object — all app navigation paths
│   └── regex.constant.ts   # EMAIL_REGEX, PHONE_REGEX, OTP_REGEX, PASSWORD_REGEX
└── helpers/
    └── validation.helper.ts  # isEmail/isPhone/isValidOtp/isStrongPassword etc.
```
`src/lib/` only holds `utils.ts` (the `cn()` class-merge helper) — matches `zp-frontend`'s own "tiny shared utilities" definition for that folder exactly; everything else moved out of `lib/` and into the buckets above.

Note: `apiManager.ts` uses `fetch`, not Axios — no reason to add an Axios dependency just to match `zp-frontend`'s HTTP client choice; the module's role (base URL, credentials, error normalization) is what's mirrored, not the library.

### Storybook

Config in `.storybook/`. Uses `@storybook/react-vite` (plain React, not `@storybook/nextjs`) — this project's Next 16 + the only Storybook version with matching Next-16 support (10.x) require a Node engine this environment doesn't meet, and `@storybook/nextjs`'s webpack/SWC integration doesn't work with Next 16.2.10 regardless. `react-vite` is a deliberate, verified-working choice, not a placeholder — fine since none of this project's components import `next/*` APIs directly; if a future component needs Next-specific mocking (routing, `next/image`, etc.), that's the point to revisit this. Stories glob (`src/**/*.stories.tsx`) already covers both story locations described above — no separate config needed per location.

Icons: `@phosphor-icons/react` (use the `*Icon`-suffixed exports, e.g. `EyeIcon` — the unsuffixed names are deprecated). Do not add `lucide-react` — it was removed in favor of Phosphor.

Fonts: `Montserrat` loaded via `next/font/google` in `src/app/layout.tsx`, exposed as the `--font-sans` CSS variable (wired to Tailwind's `font-sans` in `globals.css`). `Geist_Mono` remains for monospace (`--font-geist-mono` → `--font-mono`). Add fonts through `next/font/google`, not a manual `<style>`/`@import` tag — it self-hosts and avoids layout shift.

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply (TypeScript strictness, React prop conventions, accessibility, security). See root `CLAUDE.md` for repo-wide context.
