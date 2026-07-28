import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

const HEADER_NAME = "x-request-id";

// This is a leaf service (calls no other internal service), so this
// middleware only needs to make its own logs correlate with whichever
// caller's chain triggered the send — reusing the incoming id, or minting
// one if called without it.
export function requestId(req: Request & { requestId?: string }, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER_NAME);
  req.requestId = incoming && incoming.trim() ? incoming : randomUUID();
  res.setHeader(HEADER_NAME, req.requestId);
  next();
}
