import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

const HEADER_NAME = "x-request-id";

// Reuses gateway-service's id when the browser routed through it (that's
// the common path, and also how reports-service's own forwarded calls into
// this service arrive); mints a fresh one if called directly. Set on
// req.requestId (see require-auth.ts's AuthenticatedRequest) so every
// controller can forward the same id on any further outbound call it makes
// to auth-service/ai-service/communications-service.
export function requestId(req: Request & { requestId?: string }, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER_NAME);
  req.requestId = incoming && incoming.trim() ? incoming : randomUUID();
  res.setHeader(HEADER_NAME, req.requestId);
  next();
}
