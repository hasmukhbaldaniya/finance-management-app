import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Category, CategoryVersion } from "../models";
import { buildCategorySnapshot } from "../utils/category-snapshot";
import { createCategoryVersion } from "../utils/category-versioning";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const CATEGORY_NOT_FOUND_MESSAGE = "Category not found.";
const VERSION_NOT_FOUND_MESSAGE = "This version could not be found.";

function parseVersion(raw: string): { majorVersion: number; minorVersion: number } | null {
  const match = /^(\d+)\.(\d+)$/.exec(raw);
  if (!match) return null;
  return { majorVersion: Number(match[1]), minorVersion: Number(match[2]) };
}

// 016's read-only "Draft" entry point — a draft category has no CategoryVersion
// rows yet, so this returns its current live state directly instead of 404ing.
async function respondWithDraftSnapshot(category: Category, res: Response): Promise<void> {
  const snapshot = await buildCategorySnapshot(category);
  res.status(200).json({ category: snapshot, modifiedSteps: [] });
}

export async function getCategoryVersionDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const category = await Category.findOne({ where: { id: Number(req.params.id), organizationId } });
  if (!category) {
    res.status(404).json({ error: CATEGORY_NOT_FOUND_MESSAGE });
    return;
  }

  if (category.status === "draft") {
    await respondWithDraftSnapshot(category, res);
    return;
  }

  const parsed = typeof req.params.version === "string" ? parseVersion(req.params.version) : null;
  if (!parsed) {
    res.status(404).json({ error: VERSION_NOT_FOUND_MESSAGE });
    return;
  }

  const version = await CategoryVersion.findOne({ where: { categoryId: category.id, ...parsed } });
  if (!version) {
    res.status(404).json({ error: VERSION_NOT_FOUND_MESSAGE });
    return;
  }

  res.status(200).json({ category: version.snapshot, modifiedSteps: version.modifiedSteps });
}

export async function getCategoryLatestVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const category = await Category.findOne({ where: { id: Number(req.params.id), organizationId } });
  if (!category) {
    res.status(404).json({ error: CATEGORY_NOT_FOUND_MESSAGE });
    return;
  }

  if (category.status === "draft") {
    await respondWithDraftSnapshot(category, res);
    return;
  }

  const latest = await CategoryVersion.findOne({
    where: { categoryId: category.id },
    order: [
      ["majorVersion", "DESC"],
      ["minorVersion", "DESC"],
    ],
  });
  if (!latest) {
    res.status(404).json({ error: VERSION_NOT_FOUND_MESSAGE });
    return;
  }

  res.status(200).json({ category: latest.snapshot, modifiedSteps: latest.modifiedSteps });
}

// 016's Open Questions resolves the single biggest ambiguity in this story as:
// version creation fires when the admin leaves the Edit wizard, not per step-
// save — the frontend wizard calls this once, on Cancel/navigate-away/close,
// for an already-active category. A draft category has nothing to version yet
// (013's own Step 4 Submit creates 1.0 directly on activation instead).
export async function finishCategoryEditSession(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const category = await Category.findOne({ where: { id: Number(req.params.id), organizationId } });
  if (!category) {
    res.status(404).json({ error: CATEGORY_NOT_FOUND_MESSAGE });
    return;
  }

  if (category.status !== "active") {
    res.status(200).json({ versionCreated: false });
    return;
  }

  const version = await createCategoryVersion(category, req.userId);
  res.status(200).json({
    versionCreated: version !== null,
    version: version ? `${version.majorVersion}.${version.minorVersion}` : null,
  });
}
