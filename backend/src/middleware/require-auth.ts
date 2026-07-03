import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { verifyAccessToken } from "../utils/jwt";

export type AuthenticatedRequest = Request & { userId?: number };

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.[env.auth.cookieName];
  const payload = typeof token === "string" ? verifyAccessToken(token) : null;

  if (!payload) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  req.userId = payload.sub;
  next();
}
