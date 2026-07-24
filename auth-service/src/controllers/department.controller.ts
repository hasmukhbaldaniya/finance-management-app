import type { Response } from "express";
import { Op, col, fn } from "sequelize";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Department, Employee, EmployeeCompanyAccess } from "../models";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const DEPARTMENT_NOT_FOUND_MESSAGE = "Department not found.";
const DEPARTMENT_NAME_LENGTH_MESSAGE = "Enter a department name between 2 and 50 characters.";
const DEPARTMENT_NAME_TAKEN_MESSAGE = "A department with this name already exists.";

function parseDepartmentName(body: unknown): string {
  return typeof (body as { name?: unknown })?.name === "string" ? (body as { name: string }).name.trim() : "";
}

async function findDepartmentMembersCount(organizationId: number, departmentId: number): Promise<number> {
  return EmployeeCompanyAccess.count({ where: { organizationId, departmentId } });
}

export async function listDepartments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const sortBy = req.query.sortBy === "membersCount" ? "membersCount" : "name";
  const sortDir = req.query.sortDir === "desc" ? "desc" : "asc";
  const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(req.query.pageSize)) || DEFAULT_PAGE_SIZE));

  const departments = await Department.findAll({
    where: search ? { organizationId, name: { [Op.iLike]: `%${search}%` } } : { organizationId },
    order: sortBy === "name" ? [["name", sortDir]] : undefined,
  });

  const counts = (await EmployeeCompanyAccess.findAll({
    attributes: ["departmentId", [fn("COUNT", col("id")), "membersCount"]],
    where: { organizationId, departmentId: { [Op.not]: null } },
    group: ["departmentId"],
    raw: true,
  })) as unknown as { departmentId: number; membersCount: string }[];
  const membersCountByDepartmentId = new Map(counts.map((row) => [row.departmentId, Number(row.membersCount)]));

  let items = departments.map((department) => ({
    id: department.id,
    name: department.name,
    isActive: department.isActive,
    membersCount: membersCountByDepartmentId.get(department.id) ?? 0,
  }));

  // membersCount is an aggregate over a different table, so it can't be ordered
  // by inside the same query as the LIMIT/OFFSET above — sorted and paginated
  // here in memory instead, which is fine at this story's expected scale (an
  // organization's department list, not a firehose table — see 005's Open Questions).
  if (sortBy === "membersCount") {
    items = items.sort((a, b) => (sortDir === "asc" ? a.membersCount - b.membersCount : b.membersCount - a.membersCount));
  }

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  res.status(200).json({ departments: pageItems, hasMore: start + pageSize < items.length });
}

export async function createDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const name = parseDepartmentName(req.body);
  if (name.length < 2 || name.length > 50) {
    res.status(400).json({ error: DEPARTMENT_NAME_LENGTH_MESSAGE });
    return;
  }

  const existing = await Department.findOne({ where: { organizationId, name: { [Op.iLike]: name } } });
  if (existing) {
    res.status(409).json({ error: DEPARTMENT_NAME_TAKEN_MESSAGE });
    return;
  }

  const department = await Department.create({ organizationId, name });
  res
    .status(201)
    .json({ department: { id: department.id, name: department.name, isActive: department.isActive, membersCount: 0 } });
}

export async function updateDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const id = Number(req.params.id);
  const department = await Department.findOne({ where: { id, organizationId } });
  if (!department) {
    res.status(404).json({ error: DEPARTMENT_NOT_FOUND_MESSAGE });
    return;
  }

  const name = parseDepartmentName(req.body);
  if (name.length < 2 || name.length > 50) {
    res.status(400).json({ error: DEPARTMENT_NAME_LENGTH_MESSAGE });
    return;
  }

  const existing = await Department.findOne({
    where: { organizationId, name: { [Op.iLike]: name }, id: { [Op.ne]: id } },
  });
  if (existing) {
    res.status(409).json({ error: DEPARTMENT_NAME_TAKEN_MESSAGE });
    return;
  }

  department.name = name;
  await department.save();

  const membersCount = await findDepartmentMembersCount(organizationId, id);
  res
    .status(200)
    .json({ department: { id: department.id, name: department.name, isActive: department.isActive, membersCount } });
}

export async function updateDepartmentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const id = Number(req.params.id);
  const department = await Department.findOne({ where: { id, organizationId } });
  if (!department) {
    res.status(404).json({ error: DEPARTMENT_NOT_FOUND_MESSAGE });
    return;
  }

  if (typeof req.body?.isActive !== "boolean") {
    res.status(400).json({ error: "isActive must be a boolean." });
    return;
  }

  department.isActive = req.body.isActive;
  await department.save();

  const membersCount = await findDepartmentMembersCount(organizationId, id);
  res
    .status(200)
    .json({ department: { id: department.id, name: department.name, isActive: department.isActive, membersCount } });
}

export async function deleteDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const id = Number(req.params.id);
  const department = await Department.findOne({ where: { id, organizationId } });
  if (!department) {
    res.status(404).json({ error: DEPARTMENT_NOT_FOUND_MESSAGE });
    return;
  }

  const membersCount = await findDepartmentMembersCount(organizationId, id);
  if (membersCount > 0) {
    res.status(409).json({
      error: `This department has ${membersCount} member(s) assigned. Disable it instead, or reassign those members first.`,
    });
    return;
  }

  await department.destroy();
  res.status(200).json({ message: "Department deleted." });
}

export async function listDepartmentMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const id = Number(req.params.id);
  const department = await Department.findOne({ where: { id, organizationId } });
  if (!department) {
    res.status(404).json({ error: DEPARTMENT_NOT_FOUND_MESSAGE });
    return;
  }

  const accessRows = await EmployeeCompanyAccess.findAll({ where: { organizationId, departmentId: id } });
  const employees = await Employee.findAll({ where: { id: accessRows.map((access) => access.employeeId) } });

  res.status(200).json({
    members: employees.map((employee) => ({
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.email,
    })),
  });
}
