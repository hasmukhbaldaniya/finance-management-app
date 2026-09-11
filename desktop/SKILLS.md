# Prerequisite Skills

What you should already know — or be willing to learn — before working on `desktop/`. This is a
primer on the *general* knowledge this codebase assumes, not a description of how this specific app
is built (that's [`DEVELOPMENT.md`](./DEVELOPMENT.md)). If you're already comfortable with
TypeScript/React from `frontend/`, skim the Electron and Rust sections — those are the two genuinely
new pieces here.

## TypeScript

Everything in `desktop/` is TypeScript, `strict: true`, no `any`. If you've worked on `frontend/`
you already know enough — same language, same strictness.

- If new to TypeScript: [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- Specifically useful here: discriminated unions and type narrowing (used heavily at IPC boundaries,
  where data crossing from another process is typed `unknown` and narrowed with guards)

## React

Function components, hooks (`useState`/`useEffect`/`useContext`), React Context for shared state. No
Redux, no React Query — just the plain patterns `frontend/` already uses.

- If new to React: [react.dev — Learn](https://react.dev/learn)
- Specifically useful here: [React Context](https://react.dev/reference/react/useContext) (5 context
  providers drive Session, Registration, Onboarding, Forgot-Password, and the Category wizard)

## Electron — the one genuinely new piece if you've only done web frontend work

Electron ships a Chromium window plus a Node.js backend, wired together by three separate processes.
This project depends on understanding that split — it's the reason API calls look different here
than in `frontend/`.

- [Electron docs — Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model) —
  read this first, specifically
- [Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) — why the
  renderer can't just `require()` Node modules, and what `contextBridge` is for
- [IPC (inter-process communication)](https://www.electronjs.org/docs/latest/tutorial/ipc) —
  `ipcMain.handle` / `ipcRenderer.invoke`, the mechanism every gateway call and every Rust call in
  this app rides on

You don't need deep Electron expertise — just the mental model of "three processes, one narrow typed
bridge between them" before reading [`DEVELOPMENT.md`](./DEVELOPMENT.md#architecture).

## Rust — only if you're touching `native/`

Most feature work in this app never touches Rust. If you are:

- [The Rust Book](https://doc.rust-lang.org/book/) — chapters 1-6 cover enough (ownership, structs,
  error handling) for the kind of small, self-contained functions this addon exposes
- [napi-rs docs](https://napi.rs/) — the specific bridge used here between Rust and
  Node/Electron; skim "Getting Started" to see how a `#[napi]` function becomes a callable JS
  function with generated TypeScript types

You do not need to know Cargo's ecosystem deeply, async Rust, or unsafe code — this addon is
deliberately simple, synchronous, CPU-bound utility functions (see
[`DEVELOPMENT.md`](./DEVELOPMENT.md#the-rust-addon-native) for what it's actually used for).

## MUI (Material UI)

All styling in `desktop/` uses MUI — the `sx` prop for one-off styles, `styled()` for reusable
variants. No Tailwind, no CSS Modules, no plain CSS files (aside from the one global stylesheet with
font-face and CSS variables).

- [MUI — Getting Started](https://mui.com/material-ui/getting-started/)
- Specifically useful here: [the `sx` prop](https://mui.com/system/getting-started/the-sx-prop/) and
  [`styled()`](https://mui.com/material-ui/customization/how-to-customize/#4-global-theme-overrides)

## Not required

- **Next.js** — `desktop/` is a plain Vite SPA, not a Next.js app. If you know `frontend/`'s
  `next/link`/`next/navigation` conventions, you'll actually need to *unlearn* them here — see
  [`CLAUDE.md`](./CLAUDE.md#porting-convention) for the exact `react-router` equivalents.
- **A data-fetching library** — no React Query, no SWR. Plain `useState`/`useEffect` fetch-on-mount,
  matching `frontend/`.
- **node-gyp / NAN** — the old, ABI-fragile way of writing native Node addons. This project uses
  napi-rs specifically to avoid that pain (stable ABI, no recompiling per Node version).
