import type { Response } from "express";
import { Op } from "sequelize";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Category, CategoryVersion, CategoryZiptrripMapping } from "../models";
import { lookupEmployees } from "../services/auth.service";
import { buildCategorySnapshot } from "../utils/category-snapshot";
import { MAX_CATEGORY_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, MIN_CATEGORY_NAME_LENGTH, ZIPTRRIP_CATEGORIES } from "../utils/constants/category.constant";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const CATEGORY_NOT_FOUND_MESSAGE = "Category not found.";
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const ZIPTRRIP_KEYS = new Set(ZIPTRRIP_CATEGORIES.map((category) => category.key));

function isValidCategoryName(name: string): boolean {
  return name.length >= MIN_CATEGORY_NAME_LENGTH && name.length <= MAX_CATEGORY_NAME_LENGTH;
}

function parseZiptrripCategoryIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === "string" && ZIPTRRIP_KEYS.has(value));
}

// Step 1's first save — creates the Category row, the point a numeric id
// first exists for every later step's own save endpoint to target.
export async function createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const isDraftSave = req.body?.isDraftSave === true;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  const ziptrripCategoryIds = parseZiptrripCategoryIds(req.body?.ziptrripCategoryIds);

  if (!isDraftSave) {
    if (!isValidCategoryName(name)) {
      res.status(400).json({ error: "Category Name is required." });
      return;
    }
    if (!description) {
      res.status(400).json({ error: "Description is required." });
      return;
    }
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    res.status(400).json({ error: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.` });
    return;
  }
  if (name) {
    if (name.length > MAX_CATEGORY_NAME_LENGTH) {
      res.status(400).json({ error: `Category Name must be at most ${MAX_CATEGORY_NAME_LENGTH} characters.` });
      return;
    }
    const existing = await Category.findOne({ where: { organizationId, name: { [Op.iLike]: name } } });
    if (existing) {
      res.status(409).json({ error: "A category with this name already exists." });
      return;
    }
  }

  const category = await Category.create({
    organizationId,
    name: name || "Untitled Category",
    description: description || null,
    createdBy: req.userId,
    updatedBy: req.userId,
  });

  if (ziptrripCategoryIds.length > 0) {
    await CategoryZiptrripMapping.bulkCreate(
      ziptrripCategoryIds.map((ziptrripCategoryKey) => ({ categoryId: category.id, ziptrripCategoryKey }))
    );
  }

  res.status(201).json({ id: category.id, status: category.status });
}

// The one shared "load everything" endpoint every wizard step reads from —
// see user-stories/013-category-creation.md's Overview.
export async function getCategoryDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
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

  const snapshot = await buildCategorySnapshot(category);
  res.status(200).json({ category: snapshot });
}

export async function updateCategoryBasicDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
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

  const isDraftSave = req.body?.isDraftSave === true;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  const ziptrripCategoryIds = parseZiptrripCategoryIds(req.body?.ziptrripCategoryIds);

  if (!isDraftSave) {
    if (!isValidCategoryName(name)) {
      res.status(400).json({ error: "Category Name is required." });
      return;
    }
    if (!description) {
      res.status(400).json({ error: "Description is required." });
      return;
    }
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    res.status(400).json({ error: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.` });
    return;
  }
  if (name) {
    if (name.length > MAX_CATEGORY_NAME_LENGTH) {
      res.status(400).json({ error: `Category Name must be at most ${MAX_CATEGORY_NAME_LENGTH} characters.` });
      return;
    }
    // Excludes this category's own row — renaming to the same name isn't a
    // conflict with itself, matching 009's Edit action precedent.
    const existing = await Category.findOne({
      where: { organizationId, name: { [Op.iLike]: name }, id: { [Op.ne]: category.id } },
    });
    if (existing) {
      res.status(409).json({ error: "A category with this name already exists." });
      return;
    }
    category.name = name;
  }

  category.description = description || null;
  category.updatedBy = req.userId;
  await category.save();

  await CategoryZiptrripMapping.destroy({ where: { categoryId: category.id } });
  if (ziptrripCategoryIds.length > 0) {
    await CategoryZiptrripMapping.bulkCreate(
      ziptrripCategoryIds.map((ziptrripCategoryKey) => ({ categoryId: category.id, ziptrripCategoryKey }))
    );
  }

  res.status(200).json({ message: "Category saved." });
}

// 014's "My Categories" grid — infinite-scroll paginated, most-recently-
// updated first (see 014's own Open Questions for why).
export async function listCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(req.query.pageSize)) || DEFAULT_PAGE_SIZE));

  const { rows, count } = await Category.findAndCountAll({
    where: { organizationId },
    order: [["updatedAt", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  res.status(200).json({
    categories: rows.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      status: category.status,
      isEnabled: category.isEnabled,
      updatedAt: category.updatedAt,
    })),
    hasMore: page * pageSize < count,
  });
}

// 014's Delete action — draft-only, enforced here, not just hidden client-side.
export async function deleteCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  if (category.status !== "draft") {
    res.status(409).json({ error: "Only draft categories can be deleted." });
    return;
  }

  await category.destroy();
  res.status(200).json({ message: "Category deleted." });
}

// 014's Enable/Disable toggle — active-only, both directions confirmed
// client-side before this call is ever made.
export async function updateCategoryEnabledStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    res.status(409).json({ error: "Only active categories can be enabled or disabled." });
    return;
  }

  const isEnabled = req.body?.isEnabled === true;
  category.isEnabled = isEnabled;
  category.updatedBy = req.userId;
  await category.save();

  res.status(200).json({ category: { id: category.id, isEnabled: category.isEnabled } });
}

// 016's Version History drawer — draft categories have no real versions yet.
export async function listCategoryVersions(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    res.status(200).json({ isDraft: true });
    return;
  }

  const versions = await CategoryVersion.findAll({
    where: { categoryId: category.id },
    order: [
      ["majorVersion", "DESC"],
      ["minorVersion", "DESC"],
    ],
  });

  const createdByIds = Array.from(new Set(versions.map((version) => version.createdBy).filter((id): id is number => id !== null)));
  const employees = await lookupEmployees(createdByIds);
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  res.status(200).json({
    isDraft: false,
    versions: versions.map((version) => {
      const employee = version.createdBy ? employeeById.get(version.createdBy) : undefined;
      return {
        version: `${version.majorVersion}.${version.minorVersion}`,
        isMajor: version.isMajor,
        createdAt: version.createdAt,
        createdBy: employee ? { name: `${employee.firstName} ${employee.lastName}`.trim(), email: employee.email } : null,
      };
    }),
  });
}
