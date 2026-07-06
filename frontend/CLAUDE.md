@AGENTS.md

## Overview

Next.js (App Router, TypeScript, `src/` directory, import alias `@/*`), styled with Tailwind CSS 4 + shadcn/ui. Implements login/forgot-password (`user-stories/001-authentication.md`), the 5-step company registration wizard (`user-stories/002-organization-signup.md`), and the post-login header navigation + switch-organization screen (`user-stories/003-header-navigation.md`). Structure is modeled on `zp-frontend`'s conventions (see `../../nextjs/zp-frontend/CLAUDE.md`), scaled down to what this app actually has — folders aren't pre-created until there's real content for them.

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
├── stories/             # Storybook stories for every component, one <PascalCaseName>/ folder each
├── types/               # TypeScript types per domain
└── utils/               # constants/, helpers/, apiManager/
```
No `src/hooks/` or `src/icons/` yet — not created until there's a real shared hook or icon component to put in them (see `zp-frontend/CLAUDE.md`'s own layer descriptions for what each is for when that day comes).

### `src/apis/` — API layer

One subfolder per domain, one file per endpoint: `src/apis/auth/` (login/logout/me/forgot-password/registration endpoints — registration's endpoints are still `auth/*` since they're all under the backend's `/api/auth/registrations/*` namespace), `src/apis/organization/` (GST-availability check + `listMine.api.ts` for `GET /api/organizations/mine`), and `src/apis/user/` (`switchActiveOrganization.api.ts` for `PATCH /api/users/me/active-organization` — a separate domain from `organization/` since the endpoint itself is under the backend's `/api/users/*` namespace, not `/api/organizations/*`), each just calling `apiCall`/`postJson` from `src/utils/apiManager/apiManager.ts` and returning its typed response. Every domain folder has an `index.ts` barrel; import from the domain barrel (`@/apis/auth`, `@/apis/organization`, `@/apis/user`), not individual `.api.ts` files, outside the domain itself. No query-key layer yet — this project doesn't use a data-fetching/cache library (no React Query), so there's nothing to key. If one gets added later, add `src/apis/queryKeys/<domain>.queryKeys.ts` to match `zp-frontend`'s convention at that point.

### `src/app/` — Routes

Two route groups (groups don't affect the URL — `/login` and `/dashboard` are unchanged):
- `src/app/(public)/` — unauthenticated screens (`login/`, `forgot-password/` and its steps, `register/` and its steps). No route protection.
- `src/app/(private)/` — authenticated screens: `dashboard/`, `trips/`, `claims/`, `approvals/`, `finance/`, `reports/`, `help/`, `profile/`, and `company-settings/{employees,categories,roles-privileges,grades,departments,organizations}/`. All but `dashboard/` and `company-settings/organizations/` are placeholder pages (render `<ComingSoon title="..." />` from `src/components/coming-soon.tsx`) — see `user-stories/003-header-navigation.md`'s Out of Scope for which destinations are real. Gated by `src/proxy.ts`'s `matcher`; any new authenticated route must be added under `(private)/` **and** to that matcher array. `(private)/layout.tsx` wraps every page in `SessionProvider` (see `src/contexts/`), which does the one `getMe()` fetch for the whole private area and renders the shared `Header` — individual pages must not re-fetch `getMe()` or render their own header/logout, they consume `useSession()` instead (see `dashboard/page.tsx` for the pattern).

Route paths are centralized in `src/utils/constants/route.constant.ts` (`ROUTES` object) — never hardcode a path in `href`, `router.push`/`replace`, or a `new URL(...)` call.

Route protection: `src/proxy.ts` (Next 16 renamed Middleware to Proxy; it defaults to the Node.js runtime, not Edge) verifies the session JWT itself via `jsonwebtoken` before allowing access to matched routes — it doesn't just check cookie presence. `AUTH_COOKIE_NAME` and `JWT_SECRET` env vars must match the backend's exactly (see `.env.example`); a mismatch fails safe (redirect to `/login`) but locks out every user if only one side is updated. `JWT_SECRET` has no fallback — the app throws at startup if it's unset, same as the backend — so an insecure default can't accidentally ship to production.

### `src/components/` — Components

- `src/components/ui/` — shadcn/ui primitives, copied (not npm-installed) via `npx shadcn add <component>` (or the `shadcn` MCP server in the root `.mcp.json`). Kebab-case filenames — this is shadcn's own convention, don't rename to fight the tool's update path. `dropdown-menu.tsx` is base-ui-backed (`@base-ui/react/menu`) like `button.tsx`/`input.tsx` — its subcomponents (`DropdownMenuItem`, `DropdownMenuTrigger`, etc.) render as a custom element via the `render` prop (base-ui's equivalent of Radix's `asChild`), e.g. `<DropdownMenuItem render={<Link href={...}>Label</Link>} />`, not `asChild` + a child element. Its icons were swapped from the shadcn CLI's default `lucide-react` to `@phosphor-icons/react` after adding it, matching this project's icon convention below — always check a freshly-added shadcn file for stray `lucide-react` imports. **`DropdownMenuLabel` must be a descendant of `DropdownMenuGroup`** — base-ui's underlying `Menu.GroupLabel` throws `"Menu group parts must be used within <Menu.Group>"` if rendered standalone; wrap it (and the items it labels) in a `DropdownMenuGroup`, or use a plain styled `<div>` instead if the text isn't actually labeling a group of items below it (see `header.tsx`'s Profile menu for the latter).
- Everything else shared across features (`auth-card.tsx`, `password-input.tsx`, `logo.tsx`, `header.tsx`, `coming-soon.tsx`) lives flat in `src/components/` for now — kebab-case filenames, not `zp-frontend`'s `PascalCase/<Name>.component.tsx`. That convention makes sense at `zp-frontend`'s scale (dozens of feature domains, each with its own component folder); with a handful of components and one feature area (auth), a `<FeatureName>/` folder per component would be pure ceremony. Revisit if/when a feature area grows enough components to need its own folder (mirroring `zp-frontend`'s `Auth/`, `Trips/`, etc.). `header.tsx` is the one shared component rendered outside `(public)`/`(private)` page bodies — it's mounted once by `(private)/layout.tsx`'s `SessionProvider`, not by individual pages. Two distinct nav patterns live in it, chosen per what the item represents: **Company Settings** is a plain `Link` (not a `DropdownMenu`) whose six destinations render as a second nav row — a sub-header — directly under the main header whenever `pathname.startsWith("/company-settings")`, since they're peer pages a user switches between, not a transient action list. **Profile** stays a `DropdownMenu` popup, since its contents (identity display, View Profile, Logout) are a one-off action set, not pages to navigate between. Don't reach for `DropdownMenu` by default for every "item with children" — pick the sub-header pattern when the children are sibling routes.
- Every component's story — `ui/` primitives included — lives under `src/stories/components/<PascalCaseName>/<PascalCaseName>.stories.tsx` (e.g. `src/stories/components/Button/Button.stories.tsx`, `src/stories/components/AuthCard/AuthCard.stories.tsx`), one directory per component, importing the component via its `@/components/...` path rather than a relative import — never colocated next to the component file itself, even for shadcn-managed `ui/` files. Required for every genuinely shared/reusable component (not one-off page-specific markup), covering its meaningful states, not just a bare `Default` export. The folder name matches the exported component's name, not the source filename, when they differ (e.g. `sonner.tsx` exports `Toaster`, so its story lives at `src/stories/components/Toaster/Toaster.stories.tsx`).

### `src/contexts/` — Context providers

`<Name>Context/` folder per context, split into `context.ts` (the `createContext` call + its type), `provider.tsx` (the `<Name>Provider` component), `consumer.ts` (the `use<Name>` hook), `index.ts` (barrel). Three so far: `src/contexts/ForgotPasswordContext/` (3-step forgot-password state), `src/contexts/RegistrationContext/` (5-step registration wizard state — org name/GST from step 1, email from step 2, `registrationToken` from step 3, mobile number from step 4), and `src/contexts/SessionContext/` (the logged-in user + their active organization for the whole `(private)` area). Each wizard step that depends on an earlier step's state guards itself with a `useEffect` that redirects back to step 1 if that field is empty (see any `register/*/page.tsx` or `forgot-password/*/page.tsx`) — a full page reload loses this in-memory state by design, it isn't persisted anywhere.

`SessionContext` is a different shape from the other two: its `provider.tsx` doesn't just hold state, it owns the `getMe()` fetch (loading/error/401-redirect) that every other private page used to duplicate, and renders the shared `Header` once loaded — so `(private)/layout.tsx` is just `<SessionProvider>{children}</SessionProvider>`. `useSession()` exposes `{ user, organization, setOrganization }`; `setOrganization` exists so `company-settings/organizations/page.tsx` (the switch-organization screen) can update the displayed active organization immediately after a successful switch, without a full `getMe()` refetch or page reload.

### `src/types/` — Types

One file per domain: `<Domain>.type.ts`. `src/types/auth.type.ts` holds `AuthUser`, `src/types/organization.type.ts` holds `Organization` and `OrganizationMembership` (`Organization & { isActive: boolean }`, the shape `GET /api/organizations/mine` returns). Don't define shared types inline in components/API files.

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

Config in `.storybook/`. Uses `@storybook/react-vite` (plain React, not `@storybook/nextjs`) — this project's Next 16 + the only Storybook version with matching Next-16 support (10.x) require a Node engine this environment doesn't meet, and `@storybook/nextjs`'s webpack/SWC integration doesn't work with Next 16.2.10 regardless. `react-vite` is a deliberate, verified-working choice, not a placeholder — fine as long as a component doesn't import `next/*` APIs directly. Stories glob (`src/**/*.stories.tsx`) picks up every story regardless of location, but all stories live under `src/stories/components/` by convention (see above) — no story files exist inside `src/components/` itself. `.storybook/main.ts` also serves `public/` as a static dir; that folder has no real assets right now (the default `create-next-app` placeholders were removed as unused) but must still exist on disk — `public/.gitkeep` keeps it from disappearing, since git doesn't track empty directories and Storybook's build fails outright if the configured `staticDirs` path is missing.

**`header.tsx` has no story, unlike every other shared component**: it's the first component to actually hit the "future component needs Next-specific mocking" case flagged above — it uses `next/link` and `next/navigation`'s `usePathname`/`useRouter`, neither of which `react-vite` mocks out of the box. Adding a real story means either a routing-mock addon (e.g. `storybook-addon-remix-react-router`-style shims don't apply here; something Next-specific) or wrapping it in a fake router context — deliberately not done as a side effect of the header-navigation story, since it's Storybook infrastructure work, not a header change. Revisit this the next time a component needs the same mocking, so it's solved once for both instead of twice.

Icons: `@phosphor-icons/react` (use the `*Icon`-suffixed exports, e.g. `EyeIcon` — the unsuffixed names are deprecated). Do not add `lucide-react` — it was removed in favor of Phosphor.

Fonts: `Montserrat` loaded via `next/font/google` in `src/app/layout.tsx`, exposed as the `--font-sans` CSS variable (wired to Tailwind's `font-sans` in `globals.css`). `Geist_Mono` remains for monospace (`--font-geist-mono` → `--font-mono`). Add fonts through `next/font/google`, not a manual `<style>`/`@import` tag — it self-hosts and avoids layout shift.

## Conventions

Global rules in `~/.claude/CLAUDE.md` apply (TypeScript strictness, React prop conventions, accessibility, security). See root `CLAUDE.md` for repo-wide context.
