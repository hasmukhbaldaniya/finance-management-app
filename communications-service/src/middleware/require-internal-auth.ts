import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

// Mirrors ai-service's own require_internal_auth (app/dependencies.py) — a
// shared-secret check for the one kind of caller this service ever expects
// (another internal service, never a browser). Skipped entirely if
// INTERNAL_API_KEY isn't set, matching that same "unset means skip, don't
// hard-fail" posture. Set the same value here and on every calling service
// before running this service anywhere beyond localhost.
export function requireInternalAuth(req: Request, res: Response, next: NextFunction): void {
  if (!env.internalApiKey) {
    next();
    return;
  }
  if (req.header("X-Internal-Api-Key") !== env.internalApiKey) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  next();
}
