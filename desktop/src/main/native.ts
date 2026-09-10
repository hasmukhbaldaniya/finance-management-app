import path from "node:path";

// The single import site for the Rust addon. Every other main-process module
// that needs native code imports it from here, never from `../../native`
// directly — keeps the addon's load path in one place.
//
// Loaded via a runtime require() of the file on disk (not bundled — see the
// `external` rule in electron.vite.config.ts) because napi's generated
// index.js locates the platform-specific .node binary relative to its own
// __dirname; bundling it would break that lookup.
type NativeModule = typeof import("../../native/index.js");

// __dirname inside a packaged app still reports a path *into* app.asar (the
// archive), even though electron-builder.yml's asarUnpack means native/'s
// real files only exist in the app.asar.unpacked sibling directory — a
// .node file can't be dlopen()'d from inside the archive at all. This
// .replace() is a no-op in dev (no "app.asar" substring exists on a plain
// filesystem path), and redirects to the real unpacked location once
// packaged — the standard fix for this exact Electron pitfall.
const nativeDir = path.join(__dirname, "..", "..", "native").replace("app.asar", "app.asar.unpacked");

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const native: NativeModule = require(path.join(nativeDir, "index.js"));
