import type { Response } from "express";
import { Op, type WhereOptions } from "sequelize";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import {
  ApprovalLevel,
  Department,
  Employee,
  EmployeeCompanyAccess,
  EmployeeFfNumber,
  EmployeeInvite,
  EmployeeProject,
  Grade,
  Project,
  Role,
  Airline,
} from "../models";
import { env } from "../config/env";
import { getActiveOrganizationId } from "../utils/auth";
import { APPROVER_PRIVILEGE_KEY, GENERAL_APPROVAL_MODULE } from "../utils/constants/employee.constant";
import { COMPANY_ADMIN_ROLE_NAME } from "../utils/constants/role.constant";
import { sendEmployeeInviteEmail } from "../utils/employee-invite-mailer";
import { signOnboardingToken } from "../utils/jwt";
import { calculateAge, isEmail, isValidContactNumber, isValidEmployeeName } from "../utils/validation";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const EMPLOYEE_NOT_FOUND_MESSAGE = "Employee not found.";
const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";
const TITLES = ["Mr", "Mrs", "Ms"] as const;
const GENDERS = ["Male", "Female", "Other"] as const;
const STATUSES = ["active", "suspended"] as const;
const MINIMUM_AGE = 18;
const DAILY_INVITE_LIMIT = 5;
const ALREADY_REGISTERED_MESSAGE = "This employee has already accepted their invitation.";
const INVITE_LIMIT_MESSAGE = "This employee has reached today's invitation limit (5). Please try again tomorrow.";
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const SORTABLE_FIELDS = ["firstName", "email", "role", "department", "contactNumber", "invitationStatus", "status"] as const;
type EmployeeSortBy = (typeof SORTABLE_FIELDS)[number];
const SELF_SUSPEND_MESSAGE = "You cannot suspend your own account.";
const LAST_COMPANY_ADMIN_MESSAGE = "This organization must have at least one active Company Admin.";

// [009-employee-listing.md](../../../user-stories/009-employee-listing.md)'s
// main Employee Listing — searchable/filterable/sortable/paginated, excludes
// the caller's own record (they manage their own account elsewhere, not
// through this table — see the story's implementation notes). Role/Department
// names come from a join through EmployeeCompanyAccess, so — same trade-off as
// Grade/Department/Role's membersCount (see backend/CLAUDE.md) — sorting and
// pagination happen in memory after fetching the full filtered set, not
// inside the same paginated query as the base table.
export async function listEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  // Per-column filters, matching 007's Associated Organizations pattern (see
  // backend/CLAUDE.md) rather than 009's original single combined `search`
  // param — the frontend redesigned this listing's filter row to match that
  // page's funnel-toggle/per-column-inputs UI, at explicit request. Employee
  // ID has no dedicated visible column, so it's folded into the Name filter
  // (OR'd against employeeCode) rather than dropped entirely.
  const nameFilter = typeof req.query.name === "string" ? req.query.name.trim().slice(0, 100) : "";
  const emailFilter = typeof req.query.email === "string" ? req.query.email.trim().slice(0, 100) : "";
  const contactNumberFilter = typeof req.query.contactNumber === "string" ? req.query.contactNumber.trim().slice(0, 100) : "";
  const statusFilter = typeof req.query.status === "string" && req.query.status
    ? req.query.status.split(",").filter((value) => value === "active" || value === "suspended" || value === "pending")
    : [];
  const sortBy: EmployeeSortBy = (SORTABLE_FIELDS as readonly string[]).includes(req.query.sortBy as string)
    ? (req.query.sortBy as EmployeeSortBy)
    : "firstName";
  const sortDir = req.query.sortDir === "desc" ? "desc" : "asc";
  const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(req.query.pageSize)) || DEFAULT_PAGE_SIZE));

  const conditions: WhereOptions<Employee>[] = [{ organizationId }, { id: { [Op.ne]: req.userId } }];
  if (nameFilter) {
    conditions.push({
      [Op.or]: [
        { firstName: { [Op.iLike]: `%${nameFilter}%` } },
        { lastName: { [Op.iLike]: `%${nameFilter}%` } },
        { employeeCode: { [Op.iLike]: `%${nameFilter}%` } },
      ],
    });
  }
  if (emailFilter) {
    conditions.push({ email: { [Op.iLike]: `%${emailFilter}%` } });
  }
  if (contactNumberFilter) {
    conditions.push({ contactNumber: { [Op.iLike]: `%${contactNumberFilter}%` } });
  }
  if (statusFilter.length > 0) {
    conditions.push({
      [Op.or]: statusFilter.map((value) =>
        value === "pending" ? { invitationStatus: "pending" } : { invitationStatus: "registered", status: value }
      ),
    });
  }

  const employees = await Employee.findAll({ where: { [Op.and]: conditions } });
  const accessRows = await EmployeeCompanyAccess.findAll({
    where: { employeeId: employees.map((employee) => employee.id) },
  });
  const accessByEmployeeId = new Map(accessRows.map((access) => [access.employeeId, access]));

  const roleIds = accessRows.map((access) => access.roleId);
  const departmentIds = accessRows.map((access) => access.departmentId).filter((id): id is number => id !== null);
  const [roles, departments] = await Promise.all([
    roleIds.length > 0 ? Role.findAll({ where: { id: roleIds } }) : Promise.resolve([]),
    departmentIds.length > 0 ? Department.findAll({ where: { id: departmentIds } }) : Promise.resolve([]),
  ]);
  const roleNameById = new Map(roles.map((role) => [role.id, role.name]));
  const departmentNameById = new Map(departments.map((department) => [department.id, department.name]));

  let items = employees.map((employee) => {
    const access = accessByEmployeeId.get(employee.id);
    return {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: access ? roleNameById.get(access.roleId) ?? null : null,
      department: access?.departmentId ? departmentNameById.get(access.departmentId) ?? null : null,
      countryCode: employee.countryCode,
      contactNumber: employee.contactNumber,
      invitationStatus: employee.invitationStatus,
      status: employee.status,
    };
  });

  function compare(a: (typeof items)[number], b: (typeof items)[number]): number {
    let comparison: number;
    if (sortBy === "firstName") {
      comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    } else if (sortBy === "role" || sortBy === "department") {
      comparison = (a[sortBy] ?? "").localeCompare(b[sortBy] ?? "");
    } else if (sortBy === "contactNumber") {
      comparison = (a.contactNumber ?? "").localeCompare(b.contactNumber ?? "");
    } else {
      comparison = a[sortBy].localeCompare(b[sortBy]);
    }
    return sortDir === "asc" ? comparison : -comparison;
  }
  items = items.sort(compare);

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  res.status(200).json({ employees: pageItems, hasMore: start + pageSize < items.length });
}

// Minimal, unpaginated listing for Step 4's approver picker — a materially
// different shape from listEmployees above (009's full listing), mounted at
// GET /employees/approvers rather than GET /employees for that reason. Scoped
// to who can actually approve: the logged-in admin (every logged-in caller is
// a real Employee row now — Employee is the login entity, see
// backend/CLAUDE.md) plus any active employee whose Role carries the
// "Claim / Trip Approvals" privilege (Company Admin has it by default;
// Members doesn't — see role.constant.ts — but any custom role that grants
// it also qualifies).
export async function listEmployeesForPicker(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const approverRoles = await Role.findAll({
    where: { organizationId, privileges: { [Op.contains]: [APPROVER_PRIVILEGE_KEY] } },
    attributes: ["id"],
  });
  const approverRoleIds = approverRoles.map((role) => role.id);

  const approverAccessRows =
    approverRoleIds.length > 0
      ? await EmployeeCompanyAccess.findAll({ where: { organizationId, roleId: approverRoleIds }, attributes: ["employeeId"] })
      : [];

  const employeeIds = new Set(approverAccessRows.map((access) => access.employeeId));
  employeeIds.add(req.userId);

  const employees = await Employee.findAll({
    where: { id: Array.from(employeeIds), organizationId, status: "active" },
    order: [["firstName", "ASC"]],
  });
  res.status(200).json({
    employees: employees.map((employee) => ({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
    })),
  });
}

// Full single-employee detail — powers the Employee Listing's Edit action
// (009), which reuses 008's exact fields/sections but pre-filled and updating
// instead of creating. Combines Employee's own columns with its
// EmployeeCompanyAccess/EmployeeProject/EmployeeFfNumber/ApprovalLevel rows,
// mirroring the shapes those write endpoints already accept so the frontend
// can round-trip this response straight back into them.
export async function getEmployeeDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const employeeId = Number(req.params.id);
  const employee = await Employee.findOne({ where: { id: employeeId, organizationId } });
  if (!employee) {
    res.status(404).json({ error: EMPLOYEE_NOT_FOUND_MESSAGE });
    return;
  }

  const [access, projectRows, ffNumberRows, approvalRows] = await Promise.all([
    EmployeeCompanyAccess.findOne({ where: { employeeId } }),
    EmployeeProject.findAll({ where: { employeeId } }),
    EmployeeFfNumber.findAll({ where: { employeeId } }),
    ApprovalLevel.findAll({ where: { employeeId }, order: [["level", "ASC"]] }),
  ]);

  res.status(200).json({
    employee: {
      id: employee.id,
      title: employee.title,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      countryCode: employee.countryCode,
      contactNumber: employee.contactNumber,
      dob: employee.dob,
      gender: employee.gender,
      employeeCode: employee.employeeCode,
      status: employee.status,
      invitationStatus: employee.invitationStatus,
      roleId: access?.roleId ?? null,
      departmentId: access?.departmentId ?? null,
      gradeId: access?.gradeId ?? null,
      projectIds: projectRows.map((row) => row.projectId),
      ffNumbers: ffNumberRows.map((row) => ({ airlineId: row.airlineId, ffNumber: row.ffNumber })),
      approvers: approvalRows.map((row) => ({ level: row.level, approverEmployeeId: row.approverEmployeeId })),
    },
  });
}

export async function createEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
  const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const countryCode = typeof req.body?.countryCode === "string" ? req.body.countryCode.trim() : "";
  const contactNumber = typeof req.body?.contactNumber === "string" ? req.body.contactNumber.trim() : "";
  const dob = typeof req.body?.dob === "string" && req.body.dob.trim() ? req.body.dob.trim() : null;
  const gender = typeof req.body?.gender === "string" ? req.body.gender.trim() : "";
  const employeeCode = typeof req.body?.employeeCode === "string" ? req.body.employeeCode.trim() : "";

  if (!(TITLES as readonly string[]).includes(title)) {
    res.status(400).json({ error: "Select a valid title." });
    return;
  }
  if (!isValidEmployeeName(firstName)) {
    res.status(400).json({ error: "First Name is required." });
    return;
  }
  if (!isValidEmployeeName(lastName)) {
    res.status(400).json({ error: "Last Name is required." });
    return;
  }
  if (!isEmail(email)) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }
  if (!countryCode || !isValidContactNumber(contactNumber)) {
    res.status(400).json({ error: "Enter a valid contact number." });
    return;
  }
  if (dob) {
    const dobDate = new Date(dob);
    const today = new Date();
    if (Number.isNaN(dobDate.getTime()) || dobDate.getTime() > today.getTime()) {
      res.status(400).json({ error: "Date of birth cannot be in the future." });
      return;
    }
    if (calculateAge(dobDate, today) < MINIMUM_AGE) {
      res.status(400).json({ error: "Employee must be at least 18 years old." });
      return;
    }
  }
  if (!(GENDERS as readonly string[]).includes(gender)) {
    res.status(400).json({ error: "Select a valid gender." });
    return;
  }
  if (employeeCode.length > 30) {
    res.status(400).json({ error: "Employee ID must be at most 30 characters." });
    return;
  }

  // email/contactNumber are checked globally, not scoped to organizationId —
  // Employee.email/(countryCode,contactNumber) are globally unique now that
  // Employee is the login entity (see backend/CLAUDE.md's User → Employee
  // merge); only employeeCode stays organization-scoped.
  const [emailTaken, contactTaken, codeTaken] = await Promise.all([
    Employee.findOne({ where: { email } }),
    Employee.findOne({ where: { countryCode, contactNumber } }),
    employeeCode ? Employee.findOne({ where: { organizationId, employeeCode } }) : Promise.resolve(null),
  ]);

  if (emailTaken) {
    res.status(409).json({ error: "This email is already in use." });
    return;
  }
  if (contactTaken) {
    res.status(409).json({ error: "This contact number is already in use." });
    return;
  }
  if (codeTaken) {
    res.status(409).json({ error: "This Employee ID is already in use." });
    return;
  }

  const employee = await Employee.create({
    organizationId,
    title: title as (typeof TITLES)[number],
    firstName,
    lastName,
    email,
    countryCode,
    contactNumber,
    dob,
    gender: gender as (typeof GENDERS)[number],
    employeeCode: employeeCode || null,
    createdBy: req.userId,
    updatedBy: req.userId,
  });

  res.status(201).json({ id: employee.id });
}

export async function updateEmployeeCompanyAccess(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const employeeId = Number(req.params.id);
  const employee = await Employee.findOne({ where: { id: employeeId, organizationId } });
  if (!employee) {
    res.status(404).json({ error: EMPLOYEE_NOT_FOUND_MESSAGE });
    return;
  }

  const roleId = Number(req.body?.roleId);
  const departmentId = Number(req.body?.departmentId);
  const gradeId = Number(req.body?.gradeId);
  const projectIds = Array.isArray(req.body?.projectIds) ? req.body.projectIds.map(Number) : [];

  if (!roleId || !departmentId || !gradeId) {
    res.status(400).json({ error: "Please select a Role, Department, and Grade." });
    return;
  }

  const [role, department, grade] = await Promise.all([
    Role.findOne({ where: { id: roleId, organizationId, isActive: true } }),
    Department.findOne({ where: { id: departmentId, organizationId, isActive: true } }),
    Grade.findOne({ where: { id: gradeId, organizationId, isActive: true } }),
  ]);

  if (!role) {
    res.status(404).json({ error: "This Role is no longer available. Please choose another." });
    return;
  }
  if (!department) {
    res.status(404).json({ error: "This Department is no longer available. Please choose another." });
    return;
  }
  if (!grade) {
    res.status(404).json({ error: "This Grade is no longer available. Please choose another." });
    return;
  }

  if (projectIds.length > 0) {
    const projects = await Project.findAll({ where: { id: projectIds, organizationId, departmentId } });
    if (projects.length !== projectIds.length) {
      res.status(400).json({ error: "One or more selected projects don't belong to this department." });
      return;
    }
  }

  const [access] = await EmployeeCompanyAccess.findOrCreate({
    where: { employeeId },
    defaults: { employeeId, organizationId, roleId, departmentId, gradeId },
  });
  access.roleId = roleId;
  access.departmentId = departmentId;
  access.gradeId = gradeId;
  await access.save();

  await EmployeeProject.destroy({ where: { employeeId } });
  if (projectIds.length > 0) {
    await EmployeeProject.bulkCreate(projectIds.map((projectId: number) => ({ employeeId, projectId })));
  }

  employee.updatedBy = req.userId;
  await employee.save();

  res.status(200).json({ message: "Company access saved." });
}

export async function addEmployeeFfNumbers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const employeeId = Number(req.params.id);
  const employee = await Employee.findOne({ where: { id: employeeId, organizationId } });
  if (!employee) {
    res.status(404).json({ error: EMPLOYEE_NOT_FOUND_MESSAGE });
    return;
  }

  const rawFfNumbers = Array.isArray(req.body?.ffNumbers) ? req.body.ffNumbers : [];
  const ffNumbers: { airlineId: number; ffNumber: string }[] = [];
  const seenAirlineIds = new Set<number>();

  for (const row of rawFfNumbers) {
    const airlineId = Number(row?.airlineId);
    const ffNumber = typeof row?.ffNumber === "string" ? row.ffNumber.trim() : "";

    if (!airlineId) {
      res.status(400).json({ error: "Please select an airline." });
      return;
    }
    if (!ffNumber || ffNumber.length > 30) {
      res.status(400).json({ error: "FF Number is required." });
      return;
    }
    if (seenAirlineIds.has(airlineId)) {
      res.status(400).json({ error: "This airline has already been added." });
      return;
    }
    seenAirlineIds.add(airlineId);
    ffNumbers.push({ airlineId, ffNumber });
  }

  if (ffNumbers.length > 0) {
    const airlines = await Airline.findAll({ where: { id: ffNumbers.map((row) => row.airlineId) } });
    if (airlines.length !== seenAirlineIds.size) {
      res.status(400).json({ error: "Please select a valid airline." });
      return;
    }
  }

  await EmployeeFfNumber.destroy({ where: { employeeId } });
  if (ffNumbers.length > 0) {
    await EmployeeFfNumber.bulkCreate(ffNumbers.map((row) => ({ employeeId, ...row })));
  }

  employee.updatedBy = req.userId;
  await employee.save();

  res.status(200).json({ message: "FF numbers saved." });
}

export async function saveEmployeeApprovals(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const employeeId = Number(req.params.id);
  const employee = await Employee.findOne({ where: { id: employeeId, organizationId } });
  if (!employee) {
    res.status(404).json({ error: EMPLOYEE_NOT_FOUND_MESSAGE });
    return;
  }

  const rawApprovers = Array.isArray(req.body?.approvers) ? req.body.approvers : [];
  const approvers: { level: number; approverEmployeeId: number }[] = [];
  const seenLevels = new Set<number>();
  const seenApprovers = new Set<number>();

  for (const row of rawApprovers) {
    const level = Number(row?.level);
    const approverEmployeeId = Number(row?.approverEmployeeId);

    if (!level || !approverEmployeeId) continue;
    if (seenLevels.has(level)) {
      res.status(400).json({ error: "Each approval level must have a different approver." });
      return;
    }
    if (seenApprovers.has(approverEmployeeId)) {
      res.status(400).json({ error: "Each approval level must have a different approver." });
      return;
    }
    if (approverEmployeeId === employeeId) {
      res.status(400).json({ error: "An employee cannot approve their own requests." });
      return;
    }
    seenLevels.add(level);
    seenApprovers.add(approverEmployeeId);
    approvers.push({ level, approverEmployeeId });
  }

  if (!seenLevels.has(1)) {
    res.status(400).json({ error: "At least one approver is required." });
    return;
  }

  const approverEmployees = await Employee.findAll({
    where: { id: approvers.map((approver) => approver.approverEmployeeId), organizationId, status: "active" },
  });
  if (approverEmployees.length !== approvers.length) {
    res.status(400).json({ error: "The selected approver is no longer active." });
    return;
  }

  await ApprovalLevel.destroy({ where: { employeeId } });
  await ApprovalLevel.bulkCreate(
    approvers.map((approver) => ({
      employeeId,
      module: GENERAL_APPROVAL_MODULE,
      level: approver.level,
      approverEmployeeId: approver.approverEmployeeId,
    }))
  );

  employee.updatedBy = req.userId;
  await employee.save();

  res.status(200).json({ message: "Approvals saved." });
}

export async function sendEmployeeInvite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const employeeId = Number(req.params.id);
  const employee = await Employee.findOne({ where: { id: employeeId, organizationId } });
  if (!employee) {
    res.status(404).json({ error: EMPLOYEE_NOT_FOUND_MESSAGE });
    return;
  }

  if (employee.invitationStatus === "registered") {
    res.status(409).json({ error: ALREADY_REGISTERED_MESSAGE });
    return;
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const sentToday = await EmployeeInvite.count({ where: { employeeId, sentAt: { [Op.gte]: startOfToday } } });
  if (sentToday >= DAILY_INVITE_LIMIT) {
    res.status(429).json({ error: INVITE_LIMIT_MESSAGE });
    return;
  }

  try {
    const onboardingToken = signOnboardingToken(employee.id, employee.email);
    const onboardingLink = `${env.corsOrigin}/onboarding?token=${onboardingToken}`;
    await sendEmployeeInviteEmail(employee.email, employee.firstName, onboardingLink);
  } catch {
    res.status(500).json({ error: GENERIC_ERROR_MESSAGE });
    return;
  }

  await EmployeeInvite.create({ employeeId, sentAt: new Date(), sentBy: req.userId });

  res.status(200).json({ message: "Invitation sent." });
}

export async function updateEmployeeStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const employeeId = Number(req.params.id);
  const employee = await Employee.findOne({ where: { id: employeeId, organizationId } });
  if (!employee) {
    res.status(404).json({ error: EMPLOYEE_NOT_FOUND_MESSAGE });
    return;
  }

  const status = req.body?.status;
  if (!(STATUSES as readonly string[]).includes(status)) {
    res.status(400).json({ error: "status must be a valid value." });
    return;
  }

  if (employeeId === req.userId) {
    res.status(403).json({ error: SELF_SUSPEND_MESSAGE });
    return;
  }

  if (status === "suspended") {
    const companyAdminRole = await Role.findOne({ where: { organizationId, name: COMPANY_ADMIN_ROLE_NAME } });
    if (companyAdminRole) {
      const companyAdminAccessRows = await EmployeeCompanyAccess.findAll({
        where: { organizationId, roleId: companyAdminRole.id },
      });
      const isCompanyAdmin = companyAdminAccessRows.some((access) => access.employeeId === employeeId);
      if (isCompanyAdmin) {
        const otherActiveCompanyAdmins = await Employee.count({
          where: {
            id: companyAdminAccessRows.map((access) => access.employeeId).filter((id) => id !== employeeId),
            status: "active",
            invitationStatus: "registered",
          },
        });
        if (otherActiveCompanyAdmins === 0) {
          res.status(403).json({ error: LAST_COMPANY_ADMIN_MESSAGE });
          return;
        }
      }
    }
  }

  employee.status = status as (typeof STATUSES)[number];
  employee.updatedBy = req.userId;
  await employee.save();

  res.status(200).json({ employee: { id: employee.id, status: employee.status } });
}

export async function updateEmployeeBasicInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId || !req.userId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const employeeId = Number(req.params.id);
  const employee = await Employee.findOne({ where: { id: employeeId, organizationId } });
  if (!employee) {
    res.status(404).json({ error: EMPLOYEE_NOT_FOUND_MESSAGE });
    return;
  }

  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
  const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const countryCode = typeof req.body?.countryCode === "string" ? req.body.countryCode.trim() : "";
  const contactNumber = typeof req.body?.contactNumber === "string" ? req.body.contactNumber.trim() : "";
  const dob = typeof req.body?.dob === "string" && req.body.dob.trim() ? req.body.dob.trim() : null;
  const gender = typeof req.body?.gender === "string" ? req.body.gender.trim() : "";
  const employeeCode = typeof req.body?.employeeCode === "string" ? req.body.employeeCode.trim() : "";

  if (!(TITLES as readonly string[]).includes(title)) {
    res.status(400).json({ error: "Select a valid title." });
    return;
  }
  if (!isValidEmployeeName(firstName)) {
    res.status(400).json({ error: "First Name is required." });
    return;
  }
  if (!isValidEmployeeName(lastName)) {
    res.status(400).json({ error: "Last Name is required." });
    return;
  }
  if (!isEmail(email)) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }
  if (!countryCode || !isValidContactNumber(contactNumber)) {
    res.status(400).json({ error: "Enter a valid contact number." });
    return;
  }
  if (dob) {
    const dobDate = new Date(dob);
    const today = new Date();
    if (Number.isNaN(dobDate.getTime()) || dobDate.getTime() > today.getTime()) {
      res.status(400).json({ error: "Date of birth cannot be in the future." });
      return;
    }
    if (calculateAge(dobDate, today) < MINIMUM_AGE) {
      res.status(400).json({ error: "Employee must be at least 18 years old." });
      return;
    }
  }
  if (!(GENDERS as readonly string[]).includes(gender)) {
    res.status(400).json({ error: "Select a valid gender." });
    return;
  }
  if (employeeCode.length > 30) {
    res.status(400).json({ error: "Employee ID must be at most 30 characters." });
    return;
  }

  const [emailTaken, contactTaken, codeTaken] = await Promise.all([
    Employee.findOne({ where: { email, id: { [Op.ne]: employeeId } } }),
    Employee.findOne({ where: { countryCode, contactNumber, id: { [Op.ne]: employeeId } } }),
    employeeCode
      ? Employee.findOne({ where: { organizationId, employeeCode, id: { [Op.ne]: employeeId } } })
      : Promise.resolve(null),
  ]);

  if (emailTaken) {
    res.status(409).json({ error: "This email is already in use." });
    return;
  }
  if (contactTaken) {
    res.status(409).json({ error: "This contact number is already in use." });
    return;
  }
  if (codeTaken) {
    res.status(409).json({ error: "This Employee ID is already in use." });
    return;
  }

  employee.title = title as (typeof TITLES)[number];
  employee.firstName = firstName;
  employee.lastName = lastName;
  employee.email = email;
  employee.countryCode = countryCode;
  employee.contactNumber = contactNumber;
  employee.dob = dob;
  employee.gender = gender as (typeof GENDERS)[number];
  employee.employeeCode = employeeCode || null;
  employee.updatedBy = req.userId;
  await employee.save();

  res.status(200).json({
    employee: {
      id: employee.id,
      title: employee.title,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      countryCode: employee.countryCode,
      contactNumber: employee.contactNumber,
      dob: employee.dob,
      gender: employee.gender,
      employeeCode: employee.employeeCode,
    },
  });
}
