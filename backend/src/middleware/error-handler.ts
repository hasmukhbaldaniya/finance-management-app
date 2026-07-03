import type { NextFunction, Request, Response } from "express";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);
  res.status(500).json({ error: GENERIC_ERROR_MESSAGE });
}
