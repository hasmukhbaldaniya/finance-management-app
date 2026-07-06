import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Organization, OrganizationMember, User } from "../models";
import { isValidGstNumber } from "../utils/validation";

export async function getGstAvailability(req: Request, res: Response): Promise<void> {
  const gstNumber = typeof req.query.gstNumber === "string" ? req.query.gstNumber.trim().toUpperCase() : "";

  if (!isValidGstNumber(gstNumber)) {
    res.status(400).json({ error: "Enter a valid GST number." });
    return;
  }

  const existing = await Organization.findOne({ where: { gstNumber } });
  res.status(200).json({ available: !existing });
}

export async function listMyOrganizations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = await User.findByPk(req.userId);
  if (!user) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const memberships = await OrganizationMember.findAll({ where: { userId: user.id } });
  const organizations = await Organization.findAll({
    where: { id: memberships.map((membership) => membership.organizationId) },
  });

  res.status(200).json({
    organizations: organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      gstNumber: organization.gstNumber,
      isActive: organization.id === user.activeOrganizationId,
    })),
  });
}
