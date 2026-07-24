import type { NextFunction, Response } from "express";
import { Employee } from "../models";
import type { AuthenticatedRequest } from "./require-auth";

export type OwnerRequest = AuthenticatedRequest & { organizationId?: number };

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const NOT_OWNER_MESSAGE = "You don't have permission to view this page.";

// The first role check in this codebase beyond plain authentication — see
// user-stories/007-associated-organizations-network.md's Open Questions.
// Checks Employee.isOwner directly (set at registration for the org creator)
// rather than 006's Role/privileges entity, which isn't wired to any
// enforcement yet. Attaches organizationId so downstream handlers don't need
// to re-resolve the caller's organization themselves.
export async function requireOwner(req: OwnerRequest, res: Response, next: NextFunction): Promise<void> {
  const employee = await Employee.findByPk(req.userId);
  if (!employee) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  if (!employee.isOwner) {
    res.status(403).json({ error: NOT_OWNER_MESSAGE });
    return;
  }

  req.organizationId = employee.organizationId;
  next();
}
