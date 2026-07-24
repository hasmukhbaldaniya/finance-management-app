import type { Response } from "express";
import { Op, col, fn } from "sequelize";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Employee, EmployeeCompanyAccess, Role } from "../models";
import { isValidPrivilegeKey, type PrivilegeKey } from "../utils/constants/role.constant";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const ROLE_NOT_FOUND_MESSAGE = "Role not found.";
const ROLE_NAME_LENGTH_MESSAGE = "Enter a role name between 2 and 50 characters.";
const ROLE_NAME_TAKEN_MESSAGE = "A role with this name already exists.";
const DEFAULT_ROLE_PROTECTED_MESSAGE = "Default roles can't be changed.";
const SORTABLE_FIELDS = ["name", "roleType", "membersCount"] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

function parseRoleName(body: unknown): string {
  return typeof (body as { name?: unknown })?.name === "string" ? (body as { name: string }).name.trim() : "";
}

function parsePrivileges(body: unknown): PrivilegeKey[] | null {
  const raw = (body as { privileges?: unknown })?.privileges;
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return null;
  return raw.every(isValidPrivilegeKey) ? raw : null;
}

async function findRoleMembersCount(organizationId: number, roleId: number): Promise<number> {
  return EmployeeCompanyAccess.count({ where: { organizationId, roleId } });
}

export async function listRoles(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const sortBy: SortableField = SORTABLE_FIELDS.includes(req.query.sortBy as SortableField)
    ? (req.query.sortBy as SortableField)
    : "name";
  const sortDir = req.query.sortDir === "desc" ? "desc" : "asc";
  const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(req.query.pageSize)) || DEFAULT_PAGE_SIZE));

  const roles = await Role.findAll({
    where: search ? { organizationId, name: { [Op.iLike]: `%${search}%` } } : { organizationId },
  });

  const counts = (await EmployeeCompanyAccess.findAll({
    attributes: ["roleId", [fn("COUNT", col("id")), "membersCount"]],
    where: { organizationId },
    group: ["roleId"],
    raw: true,
  })) as unknown as { roleId: number; membersCount: string }[];
  const membersCountByRoleId = new Map(counts.map((row) => [row.roleId, Number(row.membersCount)]));

  const items = roles.map((role) => ({
    id: role.id,
    name: role.name,
    isDefault: role.isDefault,
    isActive: role.isActive,
    privileges: role.privileges,
    membersCount: membersCountByRoleId.get(role.id) ?? 0,
  }));

  // roleType/membersCount aren't plain columns to ORDER BY alongside LIMIT/OFFSET
  // (one's derived from a boolean flag's label, the other's a cross-table
  // aggregate) — sorted and paginated here in memory instead, same trade-off
  // Grade/Department make for membersCount (see 006's Open Questions).
  function compare(a: (typeof items)[number], b: (typeof items)[number]): number {
    let comparison: number;
    if (sortBy === "roleType") {
      comparison = Number(a.isDefault) - Number(b.isDefault);
    } else if (sortBy === "membersCount") {
      comparison = a.membersCount - b.membersCount;
    } else {
      comparison = a.name.localeCompare(b.name);
    }
    return sortDir === "asc" ? comparison : -comparison;
  }

  // Company Admin and Members always pin to the top of the list, ahead of every
  // custom role, regardless of which column/direction is sorted — sort only
  // reorders within each group, it never lets a custom role outrank a default
  // one. Search still excludes a default row entirely if its name doesn't match.
  const defaultItems = items.filter((item) => item.isDefault).sort(compare);
  const customItems = items.filter((item) => !item.isDefault).sort(compare);
  const sortedItems = [...defaultItems, ...customItems];

  const start = (page - 1) * pageSize;
  const pageItems = sortedItems.slice(start, start + pageSize);

  res.status(200).json({ roles: pageItems, hasMore: start + pageSize < sortedItems.length });
}

export async function createRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const name = parseRoleName(req.body);
  if (name.length < 2 || name.length > 50) {
    res.status(400).json({ error: ROLE_NAME_LENGTH_MESSAGE });
    return;
  }

  const privileges = parsePrivileges(req.body);
  if (privileges === null) {
    res.status(400).json({ error: "Enter a valid set of privileges." });
    return;
  }

  const existing = await Role.findOne({ where: { organizationId, name: { [Op.iLike]: name } } });
  if (existing) {
    res.status(409).json({ error: ROLE_NAME_TAKEN_MESSAGE });
    return;
  }

  const role = await Role.create({ organizationId, name, privileges });
  res.status(201).json({
    role: { id: role.id, name: role.name, isDefault: role.isDefault, isActive: role.isActive, privileges, membersCount: 0 },
  });
}

export async function updateRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const id = Number(req.params.id);
  const role = await Role.findOne({ where: { id, organizationId } });
  if (!role) {
    res.status(404).json({ error: ROLE_NOT_FOUND_MESSAGE });
    return;
  }
  if (role.isDefault) {
    res.status(403).json({ error: DEFAULT_ROLE_PROTECTED_MESSAGE });
    return;
  }

  const name = parseRoleName(req.body);
  if (name.length < 2 || name.length > 50) {
    res.status(400).json({ error: ROLE_NAME_LENGTH_MESSAGE });
    return;
  }

  const privileges = parsePrivileges(req.body);
  if (privileges === null) {
    res.status(400).json({ error: "Enter a valid set of privileges." });
    return;
  }

  const existing = await Role.findOne({
    where: { organizationId, name: { [Op.iLike]: name }, id: { [Op.ne]: id } },
  });
  if (existing) {
    res.status(409).json({ error: ROLE_NAME_TAKEN_MESSAGE });
    return;
  }

  role.name = name;
  role.privileges = privileges;
  await role.save();

  const membersCount = await findRoleMembersCount(organizationId, id);
  res.status(200).json({
    role: { id: role.id, name: role.name, isDefault: role.isDefault, isActive: role.isActive, privileges, membersCount },
  });
}

export async function updateRoleStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const id = Number(req.params.id);
  const role = await Role.findOne({ where: { id, organizationId } });
  if (!role) {
    res.status(404).json({ error: ROLE_NOT_FOUND_MESSAGE });
    return;
  }
  if (role.isDefault) {
    res.status(403).json({ error: DEFAULT_ROLE_PROTECTED_MESSAGE });
    return;
  }

  if (typeof req.body?.isActive !== "boolean") {
    res.status(400).json({ error: "isActive must be a boolean." });
    return;
  }

  role.isActive = req.body.isActive;
  await role.save();

  const membersCount = await findRoleMembersCount(organizationId, id);
  res.status(200).json({
    role: {
      id: role.id,
      name: role.name,
      isDefault: role.isDefault,
      isActive: role.isActive,
      privileges: role.privileges,
      membersCount,
    },
  });
}

export async function deleteRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const id = Number(req.params.id);
  const role = await Role.findOne({ where: { id, organizationId } });
  if (!role) {
    res.status(404).json({ error: ROLE_NOT_FOUND_MESSAGE });
    return;
  }
  if (role.isDefault) {
    res.status(403).json({ error: DEFAULT_ROLE_PROTECTED_MESSAGE });
    return;
  }

  const membersCount = await findRoleMembersCount(organizationId, id);
  if (membersCount > 0) {
    res.status(409).json({
      error: `This role has ${membersCount} member(s) assigned. Disable it instead, or reassign those members first.`,
    });
    return;
  }

  await role.destroy();
  res.status(200).json({ message: "Role deleted." });
}

export async function listRoleMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const id = Number(req.params.id);
  const role = await Role.findOne({ where: { id, organizationId } });
  if (!role) {
    res.status(404).json({ error: ROLE_NOT_FOUND_MESSAGE });
    return;
  }

  const accessRows = await EmployeeCompanyAccess.findAll({ where: { organizationId, roleId: id } });
  const employees = await Employee.findAll({ where: { id: accessRows.map((access) => access.employeeId) } });

  res.status(200).json({
    members: employees.map((employee) => ({
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.email,
    })),
  });
}
