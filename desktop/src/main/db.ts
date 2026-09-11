import path from "node:path";
import { app } from "electron";
import { native } from "./native";

/**
 * The sole `initDb()` call site — mirrors native.ts's own "single require
 * site" convention. Must run once, before any offline IPC channel is
 * registered (see src/main/index.ts).
 *
 * The DB lives under Electron's own per-OS user-data directory, not inside
 * the app bundle — Rust has no notion of that path itself, so it's computed
 * here and passed in as a plain string.
 */
export function initLocalDb(): void {
  const dbPath = path.join(app.getPath("userData"), "local.db");
  native.initDb(dbPath);
}
