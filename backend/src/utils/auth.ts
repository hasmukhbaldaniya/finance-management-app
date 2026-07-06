import type { CookieOptions } from "express";
import { env } from "../config/env";
import { Organization, OrganizationMember, User } from "../models";

export function accessTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: env.auth.accessTokenCookieMaxAgeMs,
    path: "/",
  };
}

export function toPublicUser(user: User): { id: number; name: string; email: string; phone: string | null } {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone };
}

// A user can belong to more than one organization over time (see
// user-stories/002-organization-signup.md); which one is "current" is tracked by
// User.activeOrganizationId (see user-stories/003-header-navigation.md), switchable
// via PATCH /api/users/me/active-organization. Falls back to the first membership
// found for a legacy row where that column is unexpectedly still null.
export async function getCurrentOrganization(
  user: User
): Promise<{ id: number; name: string; gstNumber: string } | null> {
  if (user.activeOrganizationId) {
    const organization = await Organization.findByPk(user.activeOrganizationId);
    if (organization) {
      return { id: organization.id, name: organization.name, gstNumber: organization.gstNumber };
    }
  }

  const membership = await OrganizationMember.findOne({ where: { userId: user.id } });
  if (!membership) return null;

  const organization = await Organization.findByPk(membership.organizationId);
  if (!organization) return null;

  return { id: organization.id, name: organization.name, gstNumber: organization.gstNumber };
}

// Org-scoped resources (Grade, Department, Role, ...) all key off the caller's
// active organization the same way — this is the shared lookup for that, so each
// controller doesn't re-implement "find the User, read activeOrganizationId."
export async function getActiveOrganizationId(userId: number | undefined): Promise<number | null> {
  const user = await User.findByPk(userId);
  return user?.activeOrganizationId ?? null;
}

// Backs both requireOwner (the 007 API gate) and GET /me's isOwner flag (so the
// frontend can hide the Associated Organizations nav link/route for non-owners
// without a separate request) — checks the pre-existing OrganizationMember.role
// column ("owner"/"member"), not 006's newer Role/privileges entity, which isn't
// wired to any enforcement yet (see 007's Open Questions).
export async function isOrganizationOwner(userId: number, organizationId: number): Promise<boolean> {
  const membership = await OrganizationMember.findOne({ where: { userId, organizationId } });
  return membership?.role === "owner";
}
