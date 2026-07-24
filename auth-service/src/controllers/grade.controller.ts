import type { Response } from "express";
import { Op, col, fn } from "sequelize";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Employee, EmployeeCompanyAccess, Grade } from "../models";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const GRADE_NOT_FOUND_MESSAGE = "Grade not found.";
const GRADE_NAME_LENGTH_MESSAGE = "Enter a grade name between 2 and 50 characters.";
const GRADE_NAME_TAKEN_MESSAGE = "A grade with this name already exists.";

function parseGradeName(body: unknown): string {
  return typeof (body as { name?: unknown })?.name === "string" ? (body as { name: string }).name.trim() : "";
}

async function findGradeMembersCount(organizationId: number, gradeId: number): Promise<number> {
  return EmployeeCompanyAccess.count({ where: { organizationId, gradeId } });
}

export async function listGrades(req: AuthenticatedRequest, res: Response): Promise<void> {
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

  const grades = await Grade.findAll({
    where: search ? { organizationId, name: { [Op.iLike]: `%${search}%` } } : { organizationId },
    order: sortBy === "name" ? [["name", sortDir]] : undefined,
  });

  const counts = (await EmployeeCompanyAccess.findAll({
    attributes: ["gradeId", [fn("COUNT", col("id")), "membersCount"]],
    where: { organizationId, gradeId: { [Op.not]: null } },
    group: ["gradeId"],
    raw: true,
  })) as unknown as { gradeId: number; membersCount: string }[];
  const membersCountByGradeId = new Map(counts.map((row) => [row.gradeId, Number(row.membersCount)]));

  let items = grades.map((grade) => ({
    id: grade.id,
    name: grade.name,
    isActive: grade.isActive,
    membersCount: membersCountByGradeId.get(grade.id) ?? 0,
  }));

  // membersCount is an aggregate over a different table, so it can't be ordered
  // by inside the same query as the LIMIT/OFFSET above — sorted and paginated
  // here in memory instead, which is fine at this story's expected scale (an
  // organization's grade list, not a firehose table — see 004's Open Questions).
  if (sortBy === "membersCount") {
    items = items.sort((a, b) => (sortDir === "asc" ? a.membersCount - b.membersCount : b.membersCount - a.membersCount));
  }

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  res.status(200).json({ grades: pageItems, hasMore: start + pageSize < items.length });
}

export async function createGrade(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const name = parseGradeName(req.body);
  if (name.length < 2 || name.length > 50) {
    res.status(400).json({ error: GRADE_NAME_LENGTH_MESSAGE });
    return;
  }

  const existing = await Grade.findOne({ where: { organizationId, name: { [Op.iLike]: name } } });
  if (existing) {
    res.status(409).json({ error: GRADE_NAME_TAKEN_MESSAGE });
    return;
  }

  const grade = await Grade.create({ organizationId, name });
  res.status(201).json({ grade: { id: grade.id, name: grade.name, isActive: grade.isActive, membersCount: 0 } });
}

export async function updateGrade(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const id = Number(req.params.id);
  const grade = await Grade.findOne({ where: { id, organizationId } });
  if (!grade) {
    res.status(404).json({ error: GRADE_NOT_FOUND_MESSAGE });
    return;
  }

  const name = parseGradeName(req.body);
  if (name.length < 2 || name.length > 50) {
    res.status(400).json({ error: GRADE_NAME_LENGTH_MESSAGE });
    return;
  }

  const existing = await Grade.findOne({
    where: { organizationId, name: { [Op.iLike]: name }, id: { [Op.ne]: id } },
  });
  if (existing) {
    res.status(409).json({ error: GRADE_NAME_TAKEN_MESSAGE });
    return;
  }

  grade.name = name;
  await grade.save();

  const membersCount = await findGradeMembersCount(organizationId, id);
  res.status(200).json({ grade: { id: grade.id, name: grade.name, isActive: grade.isActive, membersCount } });
}

export async function updateGradeStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const id = Number(req.params.id);
  const grade = await Grade.findOne({ where: { id, organizationId } });
  if (!grade) {
    res.status(404).json({ error: GRADE_NOT_FOUND_MESSAGE });
    return;
  }

  if (typeof req.body?.isActive !== "boolean") {
    res.status(400).json({ error: "isActive must be a boolean." });
    return;
  }

  grade.isActive = req.body.isActive;
  await grade.save();

  const membersCount = await findGradeMembersCount(organizationId, id);
  res.status(200).json({ grade: { id: grade.id, name: grade.name, isActive: grade.isActive, membersCount } });
}

export async function deleteGrade(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const id = Number(req.params.id);
  const grade = await Grade.findOne({ where: { id, organizationId } });
  if (!grade) {
    res.status(404).json({ error: GRADE_NOT_FOUND_MESSAGE });
    return;
  }

  const membersCount = await findGradeMembersCount(organizationId, id);
  if (membersCount > 0) {
    res.status(409).json({
      error: `This grade has ${membersCount} member(s) assigned. Disable it instead, or reassign those members first.`,
    });
    return;
  }

  await grade.destroy();
  res.status(200).json({ message: "Grade deleted." });
}

export async function listGradeMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = req.organizationId;
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const id = Number(req.params.id);
  const grade = await Grade.findOne({ where: { id, organizationId } });
  if (!grade) {
    res.status(404).json({ error: GRADE_NOT_FOUND_MESSAGE });
    return;
  }

  const accessRows = await EmployeeCompanyAccess.findAll({ where: { organizationId, gradeId: id } });
  const employees = await Employee.findAll({ where: { id: accessRows.map((access) => access.employeeId) } });

  res.status(200).json({
    members: employees.map((employee) => ({
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.email,
    })),
  });
}
