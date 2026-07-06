import type { NextFunction, Response } from "express";
import { OrganizationMember, User } from "../models";
import type { AuthenticatedRequest } from "./require-auth";

export type OwnerRequest = AuthenticatedRequest & { organizationId?: number };

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const NOT_OWNER_MESSAGE = "You don't have permission to view this page.";

// The first role check in this codebase beyond plain authentication — see
// user-stories/007-associated-organizations-network.md's Open Questions for why
// this checks the pre-existing OrganizationMember.role column ("owner"/"member")
// rather than 006's newer Role/privileges entity, which isn't wired to any
// enforcement yet. Attaches organizationId so downstream handlers don't need to
// re-resolve the caller's active organization themselves.
export async function requireOwner(req: OwnerRequest, res: Response, next: NextFunction): Promise<void> {
  const user = await User.findByPk(req.userId);
  if (!user || !user.activeOrganizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const membership = await OrganizationMember.findOne({
    where: { userId: user.id, organizationId: user.activeOrganizationId },
  });
  if (!membership || membership.role !== "owner") {
    res.status(403).json({ error: NOT_OWNER_MESSAGE });
    return;
  }

  req.organizationId = user.activeOrganizationId;
  next();
}
