import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { verifyAccessToken } from "../utils/jwt";

// organizationId now comes straight off the verified JWT claim (see
// jwt.ts's AccessTokenPayload) — no DB lookup needed, since it's immutable
// per employee. getActiveOrganizationId (utils/auth.ts) is kept only for
// the few call sites that still need it as an async-shaped helper during
// this migration; new/updated code should read req.organizationId directly.
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
