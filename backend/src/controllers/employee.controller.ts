import type { Response } from "express";
import { Op } from "sequelize";
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
import { getActiveOrganizationId } from "../utils/auth";
import { GENERAL_APPROVAL_MODULE, isValidModuleAccessKey } from "../utils/constants/employee.constant";
import { sendEmployeeInviteEmail } from "../utils/employee-invite-mailer";
import { calculateAge, isEmail, isValidContactNumber, isValidEmployeeName } from "../utils/validation";

const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const EMPLOYEE_NOT_FOUND_MESSAGE = "Employee not found.";
const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";
const TITLES = ["Mr", "Mrs", "Ms"] as const;
const GENDERS = ["Male", "Female", "Other"] as const;
const MINIMUM_AGE = 18;
const DAILY_INVITE_LIMIT = 5;
const ALREADY_REGISTERED_MESSAGE = "This employee has already accepted their invitation.";
const INVITE_LIMIT_MESSAGE = "This employee has reached today's invitation limit (5). Please try again tomorrow.";

// Minimal, unpaginated, active-only listing — just enough for Step 4's approver
// picker. 009-employee-listing.md's full search/sort/pagination screen is a
// separate, not-yet-built endpoint; this one isn't meant to satisfy that story.
export async function listEmployeesForPicker(req: AuthenticatedRequest, res: Response): Promise<void> {
  const organizationId = await getActiveOrganizationId(req.userId);
  if (!organizationId) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const employees = await Employee.findAll({
    where: { organizationId, status: "active" },
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

  const [emailTaken, contactTaken, codeTaken] = await Promise.all([
    Employee.findOne({ where: { organizationId, email } }),
    Employee.findOne({ where: { organizationId, countryCode, contactNumber } }),
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

  const rawModuleAccess = Array.isArray(req.body?.moduleAccess) ? req.body.moduleAccess : [];
  if (!rawModuleAccess.every(isValidModuleAccessKey)) {
    res.status(400).json({ error: "Enter a valid set of modules." });
    return;
  }
  const moduleAccess: string[] = rawModuleAccess.length > 0 ? rawModuleAccess : [GENERAL_APPROVAL_MODULE];

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
  const rows = moduleAccess.flatMap((module) =>
    approvers.map((approver) => ({
      employeeId,
      module,
      level: approver.level,
      approverEmployeeId: approver.approverEmployeeId,
    }))
  );
  await ApprovalLevel.bulkCreate(rows);

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
    await sendEmployeeInviteEmail(employee.email, employee.firstName);
  } catch {
    res.status(500).json({ error: GENERIC_ERROR_MESSAGE });
    return;
  }

  await EmployeeInvite.create({ employeeId, sentAt: new Date(), sentBy: req.userId });

  res.status(200).json({ message: "Invitation sent." });
}
