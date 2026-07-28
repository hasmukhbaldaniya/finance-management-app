import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

const HEADER_NAME = "x-request-id";

// Reuses gateway-service's id when the browser routed through it (that's
// the common path); mints a fresh one if called directly (e.g. another
// service hitting an /api/internal/* route without going through the
// gateway) so this service's own logs are never uncorrelated. Set on
// req.requestId (see require-auth.ts's AuthenticatedRequest) so every
// controller can forward the same id on any further outbound service call
// it makes.
export function requestId(req: Request & { requestId?: string }, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER_NAME);
  req.requestId = incoming && incoming.trim() ? incoming : randomUUID();
  res.setHeader(HEADER_NAME, req.requestId);
  next();
}
