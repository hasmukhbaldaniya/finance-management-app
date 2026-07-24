import type { Response } from "express";
import { Op } from "sequelize";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { env } from "../config/env";
import { Department, Employee, EmployeeCompanyAccess, Grade, Otp, Role } from "../models";
import { getCurrentOrganization } from "../utils/auth";
import { generateOtp, hashOtp, verifyOtp as compareOtp } from "../utils/otp";
import { sendOtpSms } from "../utils/sms";
import { calculateAge, isValidContactNumber, isValidEmployeeName, isValidOtp } from "../utils/validation";

const TITLES = ["Mr", "Mrs", "Ms"] as const;
const GENDERS = ["Male", "Female", "Other"] as const;
const MINIMUM_AGE = 18;
const MAX_EMPLOYEE_CODE_LENGTH = 30;
const NOT_AUTHENTICATED_MESSAGE = "Not authenticated.";
const CONTACT_NUMBER_TAKEN_MESSAGE = "This contact number is already in use.";
const INVALID_OTP_MESSAGE = "Invalid OTP. Please try again.";
const EXPIRED_OTP_MESSAGE = "This OTP has expired. Please request a new one.";
const OTP_RESEND_COOLDOWN_MESSAGE = "Please wait before requesting another OTP.";

// 010's Employee Onboarding stores a pending mobile number directly on
// Employee before it's verified (safe there — the number was never in use
// for login). Here the employee already has a working, verified number, so
// provisionally overwriting it before OTP verification would risk clobbering
// a good number on a failed/abandoned change. Instead the pending
// countryCode+contactNumber is encoded into Otp.identifier itself
// (`${employeeId}:${countryCode}:${contactNumber}`) — Otp has no FK to
// Employee by design (backend/CLAUDE.md's "OTPs are generalized"), so this
// keeps the pending state entirely within the existing Otp row rather than
// adding new Employee columns for a single in-flight value.
function mobileChangeIdentifier(employeeId: number, countryCode: string, contactNumber: string): string {
  return `${employeeId}:${countryCode}:${contactNumber}`;
}

function parseMobileChangeIdentifier(identifier: string): { countryCode: string; contactNumber: string } | null {
  const parts = identifier.split(":");
  if (parts.length !== 3) return null;
  return { countryCode: parts[1], contactNumber: parts[2] };
}

export async function getMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const employee = await Employee.findByPk(req.userId);
  if (!employee) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const [organization, access] = await Promise.all([
    getCurrentOrganization(employee),
    EmployeeCompanyAccess.findOne({ where: { employeeId: employee.id } }),
  ]);
  const [role, department, grade] = await Promise.all([
    access?.roleId ? Role.findByPk(access.roleId) : Promise.resolve(null),
    access?.departmentId ? Department.findByPk(access.departmentId) : Promise.resolve(null),
    access?.gradeId ? Grade.findByPk(access.gradeId) : Promise.resolve(null),
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
      organizationName: organization?.name ?? null,
      role: role?.name ?? null,
      department: department?.name ?? null,
      grade: grade?.name ?? null,
    },
  });
}

// Deliberately narrow — email/organizationId/roleId/departmentId/gradeId are
// not read from the body at all, so there's nothing to "forget" to ignore;
// see 012-employee-profile.md's API Design for why.
export async function updateMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const employee = await Employee.findByPk(req.userId);
  if (!employee) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
  const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
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
  if (employeeCode.length > MAX_EMPLOYEE_CODE_LENGTH) {
    res.status(400).json({ error: "Employee ID must be at most 30 characters." });
    return;
  }

  if (employeeCode) {
    const codeTaken = await Employee.findOne({
      where: { organizationId: employee.organizationId, employeeCode, id: { [Op.ne]: employee.id } },
    });
    if (codeTaken) {
      res.status(409).json({ error: "This Employee ID is already in use." });
      return;
    }
  }

  employee.title = title as (typeof TITLES)[number];
  employee.firstName = firstName;
  employee.lastName = lastName;
  employee.dob = dob;
  employee.gender = gender as (typeof GENDERS)[number];
  employee.employeeCode = employeeCode || null;
  employee.updatedBy = employee.id;
  await employee.save();

  res.status(200).json({ message: "Profile updated." });
}

export async function setMyMobile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const employee = await Employee.findByPk(req.userId);
  if (!employee) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const countryCode = typeof req.body?.countryCode === "string" ? req.body.countryCode.trim() : "";
  const contactNumber = typeof req.body?.contactNumber === "string" ? req.body.contactNumber.trim() : "";

  if (!countryCode || !isValidContactNumber(contactNumber)) {
    res.status(400).json({ error: "Enter a valid contact number." });
    return;
  }

  const existing = await Employee.findOne({ where: { countryCode, contactNumber, id: { [Op.ne]: employee.id } } });
  if (existing) {
    res.status(409).json({ error: CONTACT_NUMBER_TAKEN_MESSAGE });
    return;
  }

  // Starting a new change supersedes any previous still-pending one for this
  // employee, same "resend replaces, doesn't extend" pattern used elsewhere.
  await Otp.update(
    { consumedAt: new Date() },
    { where: { purpose: "mobile_verification", identifier: { [Op.like]: `${employee.id}:%` }, consumedAt: null } }
  );

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + env.auth.otpExpiryMinutes * 60 * 1000);
  await Otp.create({
    purpose: "mobile_verification",
    identifier: mobileChangeIdentifier(employee.id, countryCode, contactNumber),
    otpHash,
    expiresAt,
  });
  await sendOtpSms(contactNumber, otp);

  res.status(200).json({ message: "OTP sent to your mobile number." });
}

export async function resendMyMobileOtp(req: AuthenticatedRequest, res: Response): Promise<void> {
  const employee = await Employee.findByPk(req.userId);
  if (!employee) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const pending = await Otp.findOne({
    where: { purpose: "mobile_verification", identifier: { [Op.like]: `${employee.id}:%` }, consumedAt: null },
    order: [["createdAt", "DESC"]],
  });
  const parsed = pending ? parseMobileChangeIdentifier(pending.identifier) : null;
  if (!pending || !parsed) {
    res.status(400).json({ error: "Start a mobile number change first." });
    return;
  }

  const cooldownStart = new Date(Date.now() - env.auth.otpResendCooldownSeconds * 1000);
  if (pending.createdAt.getTime() > cooldownStart.getTime()) {
    res.status(429).json({ error: OTP_RESEND_COOLDOWN_MESSAGE });
    return;
  }

  await Otp.update({ consumedAt: new Date() }, { where: { id: pending.id } });

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + env.auth.otpExpiryMinutes * 60 * 1000);
  await Otp.create({
    purpose: "mobile_verification",
    identifier: mobileChangeIdentifier(employee.id, parsed.countryCode, parsed.contactNumber),
    otpHash,
    expiresAt,
  });
  await sendOtpSms(parsed.contactNumber, otp);

  res.status(200).json({ message: "OTP sent to your mobile number." });
}

export async function verifyMyMobileOtp(req: AuthenticatedRequest, res: Response): Promise<void> {
  const employee = await Employee.findByPk(req.userId);
  if (!employee) {
    res.status(401).json({ error: NOT_AUTHENTICATED_MESSAGE });
    return;
  }

  const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
  if (!isValidOtp(otp)) {
    res.status(400).json({ error: INVALID_OTP_MESSAGE });
    return;
  }

  const otpRecord = await Otp.findOne({
    where: { purpose: "mobile_verification", identifier: { [Op.like]: `${employee.id}:%` }, consumedAt: null },
    order: [["createdAt", "DESC"]],
  });
  if (!otpRecord) {
    res.status(400).json({ error: INVALID_OTP_MESSAGE });
    return;
  }
  if (otpRecord.expiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: EXPIRED_OTP_MESSAGE });
    return;
  }

  const matches = await compareOtp(otp, otpRecord.otpHash);
  if (!matches) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    res.status(400).json({ error: INVALID_OTP_MESSAGE });
    return;
  }

  const parsed = parseMobileChangeIdentifier(otpRecord.identifier);
  if (!parsed) {
    res.status(400).json({ error: INVALID_OTP_MESSAGE });
    return;
  }

  // Re-check uniqueness at the moment of verification, not just when the
  // change was started — another employee could have claimed this number
  // while this OTP sat unverified.
  const stillFree = await Employee.findOne({
    where: { countryCode: parsed.countryCode, contactNumber: parsed.contactNumber, id: { [Op.ne]: employee.id } },
  });
  if (stillFree) {
    res.status(409).json({ error: CONTACT_NUMBER_TAKEN_MESSAGE });
    return;
  }

  otpRecord.verifiedAt = new Date();
  otpRecord.consumedAt = new Date();
  await otpRecord.save();

  employee.countryCode = parsed.countryCode;
  employee.contactNumber = parsed.contactNumber;
  employee.mobileVerifiedAt = new Date();
  employee.updatedBy = employee.id;
  await employee.save();

  res.status(200).json({ message: "Mobile number updated." });
}
