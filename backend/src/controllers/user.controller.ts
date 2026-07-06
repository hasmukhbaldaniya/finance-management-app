import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Organization, OrganizationMember, User } from "../models";

export async function switchActiveOrganization(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = Number(req.body?.organizationId);

  if (!Number.isInteger(organizationId)) {
    res.status(400).json({ error: "Enter a valid organization." });
    return;
  }

  const user = await User.findByPk(req.userId);
  if (!user) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const membership = await OrganizationMember.findOne({ where: { userId: user.id, organizationId } });
  if (!membership) {
    res.status(403).json({ error: "You are not a member of this organization." });
    return;
  }

  const organization = await Organization.findByPk(organizationId);
  if (!organization) {
    res.status(404).json({ error: "Organization not found." });
    return;
  }

  user.activeOrganizationId = organizationId;
  await user.save();

  res.status(200).json({
    organization: { id: organization.id, name: organization.name, gstNumber: organization.gstNumber },
  });
}
