import type { NextFunction, Request, Response } from "express";
import { UpstreamError } from "../services/upstream-client";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

// UpstreamError carries the real status/message from whichever service
// (auth-service/claim-service) actually rejected the request — e.g. a 403
// "You don't have permission to view this page." from requireOwner should
// reach the browser as that same 403, not a generic 500.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof UpstreamError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: GENERIC_ERROR_MESSAGE });
}
