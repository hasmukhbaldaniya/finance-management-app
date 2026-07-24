import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { verifyAccessToken } from "../utils/jwt";

// organizationId comes straight off the verified JWT claim now (see
// jwt.ts) — no DB lookup, since auth-service embeds it at issue time and
// it's immutable per employee. Every claim/category/trip controller that
// used to call getActiveOrganizationId(req.userId) now just reads
// req.organizationId directly.
export type AuthenticatedRequest = Request & { userId?: number; organizationId?: number };

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.[env.auth.cookieName];
  const payload = typeof token === "string" ? verifyAccessToken(token) : null;

  if (!payload) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  req.userId = payload.sub;
  req.organizationId = payload.organizationId;
  next();
}
