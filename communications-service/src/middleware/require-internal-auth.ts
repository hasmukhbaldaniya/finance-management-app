import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

// Mirrors ai-service's own require_internal_auth (app/dependencies.py) — a
// shared-secret check for the one kind of caller this service ever expects
// (another internal service, never a browser). Fails closed if
// INTERNAL_API_KEY isn't configured — an unset key must never be treated as
// "no check needed", since that would leave these routes open to anyone.
// Set the same value here and on every calling service before running this
// service anywhere, including localhost.
export function requireInternalAuth(req: Request, res: Response, next: NextFunction): void {
  if (!env.internalApiKey || req.header("X-Internal-Api-Key") !== env.internalApiKey) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  next();
}
