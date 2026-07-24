import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

// Mirrors ai-service's/communications-service's own internal-auth check — a
// shared-secret gate for the one kind of caller /internal/* routes ever
// expect (another backend service, never a browser). Skipped entirely if
// INTERNAL_API_KEY isn't set. Set the same value here and on every calling
// service before running this service anywhere beyond localhost.
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
