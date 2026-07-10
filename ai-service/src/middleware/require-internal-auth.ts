import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

// A lightweight shared-secret check for the one caller this service ever
// expects (the main backend) — skipped entirely if INTERNAL_API_KEY isn't
// set, matching this service's own "unset means degrade, don't hard-fail"
// posture for ANTHROPIC_API_KEY. Set the same value on both sides before
// running this service anywhere beyond localhost.
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
