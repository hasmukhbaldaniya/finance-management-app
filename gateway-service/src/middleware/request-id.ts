import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

const HEADER_NAME = "x-request-id";

// The one place a request-id gets minted for a browser-originated request —
// every downstream service (and every further inter-service hop those
// services make) reuses this same id, so one failure spanning
// gateway -> reports-service -> claim-service/auth-service can be traced as
// one causal chain instead of three independent, uncorrelated log streams.
// Mutating req.headers here (rather than only setting a local field) means
// http-proxy-middleware forwards it automatically — it proxies the
// incoming request's headers as-is, no onProxyReq hook needed.
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER_NAME);
  const id = incoming && incoming.trim() ? incoming : randomUUID();
  req.headers[HEADER_NAME] = id;
  res.setHeader(HEADER_NAME, id);
  next();
}
