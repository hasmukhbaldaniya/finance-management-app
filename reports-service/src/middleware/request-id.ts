import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

const HEADER_NAME = "x-request-id";

// Reuses gateway-service's id (the only path a browser reaches this
// service through); mints one if called directly. Set on req.requestId
// (see require-auth.ts's AuthenticatedRequest) so every report handler can
// forward the same id on its own outbound calls to auth-service/claim-service
// — this service's fan-out is exactly the multi-hop case request-ids exist
// to make traceable.
export function requestId(req: Request & { requestId?: string }, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER_NAME);
  req.requestId = incoming && incoming.trim() ? incoming : randomUUID();
  res.setHeader(HEADER_NAME, req.requestId);
  next();
}
