# Development Guide

Everything you need to build, understand, and extend `desktop/`: the technologies it's built on, how
its folders are organized, how it's architected, and how to actually develop day-to-day. If you
haven't already, read [`SKILLS.md`](./SKILLS.md) first for the prerequisite concepts this guide
assumes (Electron's process model especially).

## Table of contents

- [What this is](#what-this-is)
- [Technology stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Getting set up](#getting-set-up)
- [Day-to-day development](#day-to-day-development)
- [Folder structure](#folder-structure)
- [Architecture](#architecture)
  - [The three processes](#the-three-processes)
  - [The gateway bridge](#the-gateway-bridge--why-api-calls-happen-in-main)
  - [The Rust addon (`native/`)](#the-rust-addon-native)
  - [Routing](#routing)
  - [State management](#state-management)
  - [Styling](#styling)
- [Porting convention (frontend → desktop)](#porting-convention-frontend--desktop)
- [Packaging](#packaging)
- [Conventions](#conventions)
- [Troubleshooting](#troubleshooting)

---

## What this is

`desktop/` is the eighth app in the Finance Management monorepo — a native macOS desktop client that
is a full, screen-for-screen counterpart to [`frontend/`](../frontend). It uses the exact same
backend (`gateway-service` and everything behind it) and the exact same accounts; it does not have
its own database or its own auth. Its only structural difference from `frontend/` is *how* it's
delivered: a packaged Electron app instead of pages served over HTTP, with a small Rust native addon
for CPU-bound local work.

## Technology stack

| Layer | Technology | Version | Notes |
| --- | --- | --- | --- |
| Desktop shell | [Electron](https://www.electronjs.org/) | 44.3.0 | Three-process app (main/preload/renderer) |
| Build tool | [electron-vite](https://electron-vite.org/) | 5.0.0 | Unifies main/preload/renderer builds into one Vite-based pipeline |
| Bundler (under the hood) | [Vite](https://vitejs.dev/) | 7.3.6 | Pinned below latest — electron-vite 5 doesn't yet support Vite 8 |
| UI framework | [React](https://react.dev/) | 19.3.0 | Function components + hooks only |
| Language | [TypeScript](https://www.typescriptlang.org/) | 5.9.3 | `strict: true` everywhere, matches `frontend/`'s major version |
| Styling | [MUI (Material UI)](https://mui.com/material-ui/) | ^9.4.0 | `sx` prop + `styled()`, matching `frontend/`'s convention |
| Routing | [react-router](https://reactrouter.com/) | ^8.3.1 | The modern unified package (not the legacy `react-router-dom` split), using `HashRouter` |
| Date handling | [date-fns](https://date-fns.org/) + [MUI X Date Pickers](https://mui.com/x/react-date-pickers/) | ^4.4.0 / ^9.13.0 | Matches `frontend/` |
| Icons | [@phosphor-icons/react](https://phosphoricons.com/) | ^2.1.10 | Matches `frontend/` |
| Native layer | [Rust](https://www.rust-lang.org/) via [napi-rs](https://napi.rs/) | napi 3.12.2 / @napi-rs/cli 3.9.0 | Compiles to a `.node` addon loaded directly by the main process |
| Content hashing | [blake3](https://crates.io/crates/blake3) (Rust crate) | — | Used for receipt-folder duplicate detection |
| Packaging | [electron-builder](https://www.electron.build/) | ^26.16.1 | Produces `.dmg`/`.zip` (macOS), `.exe` (Windows), `.AppImage`/`.deb` (Linux) — each built natively per-OS in CI |

Electron itself bundles a specific Node.js version internally, and napi's stable ABI (N-API) is what
lets the same compiled Rust binary run correctly under both plain Node (used by build tooling) and
Electron's bundled Node — no recompiling per Electron version.

## Prerequisites

- **macOS on Apple Silicon (arm64)** — this repo's dev machine, and the only platform local `npm run
  dev`/`build:mac` work on. Windows and Linux packages are built by CI, not locally — see
  [Packaging](#packaging).
- **Node.js 22.19.0**, pinned in [`.nvmrc`](./.nvmrc) — Electron 44 requires Node `>=22.12.0`; run
  `nvm use` in this directory before any `npm` command.
- **Xcode Command Line Tools** (`xcode-select --install`) — needed to compile the Rust addon and for
  Electron's own native dependencies.
- **Rust toolchain** (`rustc` + `cargo`) — install via [rustup](https://rustup.rs/) if you don't have
  it. Any reasonably recent stable toolchain works; this project doesn't pin a specific Rust version.
- A running backend — at minimum `gateway-service` and `auth-service` (see the
  [root `CLAUDE.md`](../CLAUDE.md) for starting every service and database via `docker compose`).

## Getting set up

```bash
cd desktop
nvm use
npm install          # runs `npm run build:native` automatically via postinstall
cp .env.example .env # defaults to http://localhost:4400/api — edit if your gateway runs elsewhere
npm run dev
```

`npm install`'s `postinstall` hook builds the Rust addon (`native/*.node`) for your machine's
platform+arch. If you ever see errors about a missing or stale `.node` file, re-run
`npm run build:native` directly.

## Day-to-day development

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts `electron-vite dev` — opens the Electron window, renderer has hot module reload |
| `npm run build` | Production build of all three targets (main/preload/renderer) into `out/` |
| `npm run start` | Previews the production build (`electron-vite preview`) without packaging |
| `npm run typecheck` | Project-references `tsc -b --noEmit` across main/preload and renderer configs |
| `npm run build:native` | Rebuilds the Rust addon only (`native/*.node` + `index.d.ts`) |
| `npm run build:mac` | Full production build + `electron-builder --mac --arm64` → `dist/*.dmg`, `dist/*.zip` |
| `npm run build:win` | Same, packaged for Windows → `dist/*.exe` (only succeeds on a Windows machine) |
| `npm run build:linux` | Same, packaged for Linux → `dist/*.AppImage`, `dist/*.deb` (only succeeds on Linux) |

Editing a renderer file (anything under `src/renderer/src/`) hot-reloads instantly while `npm run
dev` is running. Editing `src/main/**` or `src/preload/**` requires an Electron restart —
`electron-vite dev` handles this automatically (it restarts the Electron process for you on main/
preload changes).

Editing Rust code (`native/src/lib.rs`) requires `npm run build:native` followed by an Electron
restart to pick up the newly compiled `.node` file.

There is no test suite in `desktop/` yet — verification has so far been manual (run the app, exercise
the screen) and, during initial development, via Chrome DevTools Protocol driving the real UI. If you
add tests, document the runner and command here.

## Folder structure

```
desktop/
├── CLAUDE.md                    # AI-agent guidance (Claude Code reads this automatically)
├── README.md                    # Project overview + quick start
├── SKILLS.md                    # Prerequisite knowledge primer
├── DEVELOPMENT.md               # This file
├── package.json                 # Own lockfile — installed and run independently of the rest of the repo
├── electron.vite.config.ts      # Build config for all 3 targets: main, preload, renderer
├── electron-builder.yml         # Packaging config (macOS dmg/zip)
├── tsconfig.json                # Root — references the two below via TS project references
├── tsconfig.node.json           # main + preload (Node types)
├── tsconfig.web.json            # renderer (DOM types, `@/*` path alias)
├── .nvmrc                       # Pins Node 22.19.0
├── .env / .env.example          # VITE_API_BASE_URL — the gateway's base URL
├── src/
│   ├── main/                    # Main process — Node.js, full OS access, no UI
│   │   ├── index.ts              # App lifecycle: whenReady, BrowserWindow creation, macOS quit/activate handling
│   │   ├── native.ts             # The single import site for the Rust addon (see below)
│   │   ├── ipc/
│   │   │   ├── native.ipc.ts      # ipcMain.handle channels for Rust calls
│   │   │   └── gateway.ipc.ts     # ipcMain.handle channels for the gateway bridge (request/upload/download)
│   │   └── api/
│   │       └── gateway.ts         # Real HTTP calls to gateway-service via a persistent Electron session
│   ├── preload/
│   │   ├── index.ts               # contextBridge surface — the *only* API the renderer can see
│   │   └── index.d.ts             # Types for `window.api`, shared with the renderer via tsconfig include
│   └── renderer/                 # Renderer process — sandboxed Chromium, no Node access
│       ├── index.html
│       └── src/
│           ├── main.tsx           # React root: HashRouter + MUI theme provider stack
│           ├── routes.tsx         # Route config mirroring frontend/src/app's tree
│           ├── styles/global.css  # Font-face + CSS variables (replaces next/font)
│           ├── theme/             # colors.ts, theme.ts, theme-registry.tsx — MUI theme, ported from frontend/
│           ├── apis/              # ~18 domains, ~100 files — one file per endpoint, ported verbatim from frontend/
│           ├── types/             # *.type.ts — ported verbatim from frontend/
│           ├── utils/
│           │   ├── apiManager/     # apiCall/postJson/uploadFile/downloadFile — same signatures as frontend/, rewritten internals (see Architecture)
│           │   ├── constants/      # ROUTES, regex, enums — ported verbatim
│           │   └── helpers/        # Pure functions — ported verbatim
│           ├── contexts/          # SessionContext, RegistrationContext, OnboardingContext, ForgotPasswordContext, CategoryWizardContext
│           ├── hooks/              # useInfiniteScroll, useStableListKeys
│           ├── components/
│           │   ├── ui/             # Design-system primitives (Button, Input, Dialog, Table, Toast, ...)
│           │   └── <feature>/      # grade/, department/, role/, employee/, employee-invite/, category/, trip/, claim/, profile/, report/
│           └── screens/           # One folder per feature area — the actual pages
│               ├── auth/, forgot-password/, register/, onboarding/   # Pre-account / auth flows
│               ├── private/                                          # PrivateLayout — the authenticated app shell
│               ├── dashboard/, profile/, help/                       # Read-only cluster
│               ├── company-settings/, employees/                     # CRUD cluster
│               ├── categories/                                       # 4-step wizard
│               ├── trips/                                            # Trip CRUD
│               └── claims/                                           # Manual + AI-assisted claims
└── native/                       # Rust crate — the napi-rs addon
    ├── Cargo.toml
    ├── build.rs                  # Calls napi_build::setup()
    ├── src/lib.rs                # #[napi] functions — the entire Rust surface
    ├── index.js / index.d.ts     # Generated by @napi-rs/cli — commit these, don't hand-edit
    └── *.node                    # The compiled platform-specific binary (gitignored)
```

Screen folder names are `PascalCase` (`LoginScreen.tsx`, `TripsListScreen.tsx`) rather than
`frontend/`'s file-system-routed `page.tsx`/`layout.tsx` convention, since routing here is an
explicit config file (`routes.tsx`), not folder structure.

## Architecture

### The three processes

Every Electron app is really three separate processes talking over a narrow bridge, and understanding
this split explains almost every non-obvious decision in this codebase:

1. **Main** (`src/main/`) — a full Node.js process. Creates the window, has filesystem/network
   access, loads the Rust addon, and is the only place that talks to `gateway-service`.
2. **Preload** (`src/preload/`) — runs in a special context with access to a limited Node API and
   the eventual page's `window`, but nothing in between. Its only job is
   `contextBridge.exposeInMainWorld("api", {...})`, publishing a small, explicit, typed surface.
3. **Renderer** (`src/renderer/`) — a sandboxed Chromium page running the actual React app. It has
   **no** access to Node, the filesystem, or any privileged API — only whatever `window.api` the
   preload script chose to expose.

The window is created with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` (see
`src/main/index.ts`). This is a deliberate security boundary, not incidental: even if the renderer
were compromised (e.g. by a malicious API response rendered as content), it cannot reach the
filesystem, spawn processes, or read an auth token directly — because there isn't one in its process
at all.

### The gateway bridge — why API calls happen in main

The single most important architectural decision in this app: **every HTTP call to
`gateway-service` happens in the main process, never the renderer.**

`gateway-service` enables CORS with `cors({ origin: env.corsOrigin, credentials: true })` — a single
literal origin string, compared by equality. `frontend/` satisfies this because it always runs on
that one exact origin. A renderer here would run over `file://` (packaged) or a dev Vite port
(`http://localhost:5173`-ish) — neither can ever equal that one configured string, and credentialed
CORS cannot use a wildcard. The fix is not to loosen `gateway-service`'s CORS config (that would be a
real security regression); the fix is that **main-process HTTP requests aren't subject to CORS at
all** — CORS is a browser/renderer concept.

Concretely:

- `src/main/api/gateway.ts` makes the real request using `session.fromPartition("persist:finance").fetch()`
  — **not** `net.fetch()` (always uses Electron's default session) and **not** Node's global `fetch`
  (doesn't touch Electron's cookie jar at all). The named partition persists cookies across app
  restarts and is encrypted at rest via the OS keychain on macOS.
- `src/main/ipc/gateway.ipc.ts` registers exactly **three** generic `ipcMain.handle` channels:
  `gateway:request` (JSON), `gateway:upload`, `gateway:download` — not one channel per endpoint.
- The preload exposes these as `window.api.gateway.request/upload/download`.
- `src/renderer/src/utils/apiManager/apiManager.ts` — the renderer-side HTTP layer — keeps the exact
  same exported names and signatures as `frontend/`'s (`apiCall`, `postJson`, `uploadFile`,
  `downloadFile`, `ApiError`, `GENERIC_ERROR_MESSAGE`), but internally calls
  `window.api.gateway.*` instead of `fetch()`.
- Every file in `apis/` (all ~100 of them, across all ~18 domains) is a **verbatim** port from
  `frontend/` — they call `apiCall`/`postJson`/etc. exactly as before and have no idea an IPC hop is
  involved.

This is why three generic channels serve ~100 endpoints instead of ~100 individual channels: the
abstraction boundary is `apiManager.ts`, not the IPC layer.

**Uploads and downloads** need one extra adaptation, since `FormData`/`Blob` don't survive Electron's
IPC structured-clone boundary. The renderer converts a `File` into `{ kind: "file", name, fileName,
mimeType, data: ArrayBuffer }` before sending it over IPC; `src/main/api/gateway.ts` reconstructs a
real `FormData` on the main-process side before making the actual HTTP request. Downloads work in
reverse — main fetches the bytes and hands them back as an `ArrayBuffer`.

The renderer never has a token or a cookie to read — `document.cookie` is empty there by design, and
`window.api` exposes no token getter. Auth state lives entirely in the main process's session
partition.

### The Rust addon (`native/`)

Rust is used for exactly the kind of work it's actually good for here: **CPU-bound, synchronous, local
work** — currently, scanning a user-chosen receipt folder and content-hashing every file with BLAKE3
to detect duplicates before upload. It is *not* used for orchestration, networking, or anything
involving async I/O to a remote service — that stays in TypeScript.

- **Bridge**: [napi-rs](https://napi.rs/), via Node-API (N-API) — a **stable ABI**. The same
  compiled `.node` binary runs under both Node (for build tooling) and Electron's bundled Node with
  no recompilation, and survives Electron version bumps without a rebuild. This is the reason
  napi-rs was chosen over the older `node-gyp`/NAN approach, which ties a binary to one specific
  Node ABI version.
- **Location**: `src/main/native.ts` is the *only* file that `require()`s the compiled addon —
  every other main-process module imports the Rust functions from here, never from `native/`
  directly.
- **Why not WASM**: WASM runs sandboxed inside the renderer with no filesystem access, which removes
  the entire reason to reach for Rust here (folder scanning needs real filesystem access).
- **Why not a sidecar process**: a separate executable would need its own codesigning/notarization
  entry and its own lifecycle management (spawn, health-check, restart-on-crash). An in-process addon
  is just a file in the app bundle, and calls are direct function calls rather than a
  serialize/deserialize round trip over stdio.
- **The asar packaging gotcha**: `__dirname` inside a packaged Electron app still reports a path
  *into* `app.asar` (the archive) even when `electron-builder.yml`'s `asarUnpack` extracted the real
  `.node` file to the `app.asar.unpacked` sibling directory — and a native binary can't be
  `dlopen()`'d from inside an asar archive at all. `src/main/native.ts` works around this with
  `.replace("app.asar", "app.asar.unpacked")` on the resolved path (a no-op in dev, since no
  `"app.asar"` substring exists on a plain filesystem path).

To add a new Rust function: add a `#[napi]`-annotated function in `native/src/lib.rs`, run `npm run
build:native` (regenerates `index.d.ts` automatically — never hand-edit it), call it from
`src/main/native.ts`'s consumers, and expose it through `native.ipc.ts` + the preload if the renderer
needs it.

### Routing

`react-router` (the modern unified package — not the legacy `react-router-dom` split) with
**`HashRouter`**, not `BrowserRouter`. A packaged app loads over `file://` with no server behind it
to resolve a deep sub-path on reload (e.g. reloading on `/trips/7` with `BrowserRouter` would 404
against the filesystem); `HashRouter` keeps the entire route in the URL fragment
(`file:///.../index.html#/trips/7`), which a static file load always satisfies.

`src/renderer/src/routes.tsx` is a hand-written route config mirroring `frontend/src/app`'s
file-system-routed tree — nested `<Route element={<XLayout/>}>` blocks stand in for what were
Next.js `layout.tsx` files (`PrivateLayout`, `ForgotPasswordLayout`, `RegisterLayout`,
`OnboardingLayout`, `CategoriesLayout`), each wrapping its child routes in the relevant context
provider.

### State management

No new data-fetching library — plain `useState`/`useEffect` fetch-on-mount, exactly matching
`frontend/`'s own convention (which has no React Query either). This is a port, not a redesign.
React Context is used exactly where `frontend/` uses it: `SessionContext` (current user + auth
state), and one context per multi-step wizard (`RegistrationContext`, `OnboardingContext`,
`ForgotPasswordContext`, `CategoryWizardContext`).

### Styling

[MUI](https://mui.com/material-ui/) — the `sx` prop for one-off styles, `styled()` for reusable
variants — matching `frontend/` exactly, including the theme itself (`theme/colors.ts` and
`theme/theme.ts` are copied over unchanged). No Tailwind, no CSS Modules, no other CSS-in-JS library.
The one exception is `styles/global.css`, which defines the `@font-face` and CSS custom properties
that replace `next/font/google`'s Montserrat loader (not usable outside Next.js).

## Porting convention (frontend → desktop)

When bringing a new screen or component over from `frontend/`, these are the mechanical swaps that
have applied consistently across every screen ported so far:

| `frontend/` (Next.js) | `desktop/` (react-router) |
| --- | --- |
| `import Link from "next/link"` | `import { Link } from "react-router"` |
| `<Link href="/x">` | `<Link to="/x">` |
| `useRouter()` from `next/navigation` | `useNavigate()` from `react-router` |
| `router.push(x)` | `navigate(x)` |
| `router.replace(x)` | `navigate(x, { replace: true })` |
| `useParams()` from `next/navigation` | `useParams()` from `react-router` (same name, different import) |
| `useSearchParams()` tuple destructure | react-router's `useSearchParams()` (slightly different return shape — check call sites) |
| `<Suspense>` wrapping a `useSearchParams()` consumer | Usually droppable — that wrapper exists only for Next's SSR requirement around `useSearchParams` |
| `process.env.NEXT_PUBLIC_API_BASE_URL` | `import.meta.env.VITE_API_BASE_URL` |
| `page.tsx` / `layout.tsx` file-system routing | An explicit `<Route>` entry in `routes.tsx` |

`apis/`, `types/`, `utils/constants/`, and `utils/helpers/` port **verbatim** — they have zero
Next.js imports in `frontend/` already. `apiManager.ts` is the one file whose internals change (see
[The gateway bridge](#the-gateway-bridge--why-api-calls-happen-in-main)) while keeping identical
exported signatures, so nothing that calls it needs to change.

## Packaging

Packages ship for **macOS, Windows, and Linux** — but every one of them is built natively on its own
OS, never cross-compiled. The Rust addon compiles to a binary tied to one OS+CPU architecture, so
there's no single machine that can honestly produce (let alone verify) a binary for an OS it isn't
running. `.github/workflows/desktop-release.yml` is a GitHub Actions matrix with one job per
OS+arch — `macos-latest` (arm64), `windows-latest` (x64), `windows-11-arm` (arm64), `ubuntu-latest`
(x64), `ubuntu-24.04-arm` (arm64) — each installing its own Rust toolchain and running
`napi build --platform` for whatever platform it actually is. Trigger it manually from the Actions
tab, or push a tag like `desktop-v0.1.0`.

Locally, you can only build a package for the OS you're on:

```bash
npm run build:mac     # macOS (dmg + zip, arm64) — works on this repo's dev machine
npm run build:win     # Windows (NSIS .exe) — only succeeds on a Windows machine/runner
npm run build:linux   # Linux (AppImage + deb) — only succeeds on a Linux machine/runner
```

`electron-builder.yml`'s `asarUnpack: ["native/**/*"]` extracts the Rust addon out of the asar
archive at build time on every platform — required, since a `.node` binary can't be loaded from
inside an asar (see [The Rust addon](#the-rust-addon-native) above for the matching runtime-side
fix). `win.target.arch`/`linux.target.arch` each list `[x64, arm64]`; CI passes an explicit
`--x64`/`--arm64` flag per job so a given runner only ever builds the one arch it's actually running,
never both.

**A real bug found while adding Windows/Linux targets, worth knowing about**: `electron-builder@26.15.3`
shipped with a bundled `app-builder-lib` that depended on a pure-ESM `@noble/hashes@2.x`, while its
own blockmap-generation code still used a CommonJS `require()` — breaking with `ERR_REQUIRE_ESM` on
*every* build that produces a `zip`/blockmap output (including the pre-existing macOS `zip` target,
so this wasn't a new-platform-specific bug). Fixed by bumping to `electron-builder@^26.16.1`, whose
`app-builder-lib` reverted to a CJS-compatible `@noble/hashes@^1.8.0` range. If you ever see
`ERR_REQUIRE_ESM` mentioning `@noble/hashes` again, it's this same class of issue — check
`app-builder-lib`'s declared `@noble/hashes` range before reaching for a package-level `overrides`
hack (which risks resolving to a version missing the specific export subpath entirely).

## Conventions

These are the same global conventions applied elsewhere in this monorepo (TypeScript strictness,
React prop naming, accessibility, security — see the [root `CLAUDE.md`](../CLAUDE.md)), applied to
this specific stack:

- **TypeScript**: `strict: true`, no `any` — data crossing the IPC boundary is external by
  definition, so type it `unknown` and narrow with guards. Explicit return types on public APIs.
- **React props**: `type <ComponentName>Props` (never `interface`), `onXxx` handlers,
  `isXxx`/`hasXxx`/`canXxx` booleans, `className?: string` passthrough, `React.ReactNode` children,
  never an array index as a list `key`.
- **Styling**: MUI only — see [Styling](#styling) above.
- **Routing**: `react-router` with `HashRouter` — see [Routing](#routing) above.
- **State**: no new data-fetching library — see [State management](#state-management) above.
- **Security**: `contextIsolation`/`sandbox` stay on; no hardcoded base URLs (use
  `VITE_API_BASE_URL`); no `eval`/`new Function`; validate IPC payloads at the boundary.
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
  `chore:`, `refactor:`, `docs:`) — no ticket-number prefix in this repo.

For AI-agent-specific guidance (how Claude Code should approach changes here), see
[`CLAUDE.md`](./CLAUDE.md) — it covers the same ground from an agent's operating perspective rather
than a human onboarding perspective.

## Troubleshooting

**`ERR_REQUIRE_ESM` or a Node version complaint on startup** — you're not on Node 22.19.0. Run `nvm
use` in `desktop/`.

**Renderer can't resolve a package / blank preload errors** — if you've hand-edited
`electron.vite.config.ts`, check that the preload target still has `build.externalizeDeps: false`.
electron-vite defaults this to `true`, which breaks the sandboxed preload's ability to bundle
third-party dependencies (its `require()` can't resolve `node_modules` at runtime).

**"Cannot find module" for the native addon** — run `npm run build:native`. If it persists after a
fresh clone, confirm Xcode Command Line Tools and a Rust toolchain are installed.

**A packaged build can't find the Rust addon** but `npm run dev` works fine — check
`src/main/native.ts`'s `app.asar`/`app.asar.unpacked` path handling hasn't regressed; this is the
single most likely dev-vs-packaged divergence in this app (see
[The Rust addon](#the-rust-addon-native)).

**A route 404s or blanks out on reload inside the packaged app** — confirm it's still using
`HashRouter`, not `BrowserRouter`. This only manifests in the packaged `file://` build, not in dev.
