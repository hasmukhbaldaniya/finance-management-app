// Pure type definitions, deliberately split out of sync.ts (which imports
// the native addon) — preload/index.d.ts needs these types for the renderer
// project's Window augmentation, but that project (tsconfig.web.json) can't
// reach native.ts's transitive `typeof import("../../native/index.js")`
// without a project-reference it doesn't have. Keeping this file import-free
// means resolving it never pulls native.ts in, the same way gateway.ts (a
// leaf file with no local imports) already works from preload/index.d.ts.

export type SyncProgress =
  | { phase: "start"; total: number }
  | { phase: "progress"; completed: number; total: number }
  | { phase: "done"; synced: number; failed: boolean }
  | { phase: "error"; message: string };

export type SyncResult = { synced: number; failed: boolean; error?: string };
