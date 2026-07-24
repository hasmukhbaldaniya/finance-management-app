import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { verifyAccessToken } from "../utils/jwt";

// Mirrors claim-service's own require-auth.ts. Unlike claim-service, this
// service has no local business logic that needs organizationId/isOwner —
// it forwards the caller's own cookie header upstream and relies on
// auth-service's/claim-service's own requireAuth/requireOwner to do the
// real authorization. This middleware's job is narrower but still real:
// reject a missing/invalid/expired cookie here, fast, instead of treating
// "some Cookie header is present" as good enough and paying for a doomed
// upstream round trip just to find out it wasn't.
export type AuthenticatedRequest = Request & {
  userId?: number;
  organizationId?: number;
  isOwner?: boolean;
  cookieHeader?: string;
};

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.[env.auth.cookieName];
  const payload = typeof token === "string" ? verifyAccessToken(token) : null;

  if (!payload) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const cookieHeader = req.headers.cookie;
  req.userId = payload.sub;
  req.organizationId = payload.organizationId;
  req.isOwner = payload.isOwner;
  req.cookieHeader = typeof cookieHeader === "string" ? cookieHeader : "";
  next();
}
