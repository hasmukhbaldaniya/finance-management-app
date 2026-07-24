import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./require-auth";

const NOT_OWNER_MESSAGE = "You don't have permission to view this page.";

// Unlike auth-service's requireOwner (which looks Employee.isOwner up from
// its own DB), claim-service has no local Employee table — isOwner comes
// straight off the verified JWT claim (see jwt.ts), the same way
// organizationId already does. Must be mounted after requireAuth.
export function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.isOwner) {
    res.status(403).json({ error: NOT_OWNER_MESSAGE });
    return;
  }
  next();
}
