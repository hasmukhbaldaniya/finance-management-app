import type { Request, Response } from "express";
import { Op } from "sequelize";
import { env } from "../config/env";
import { Employee, Otp } from "../models";
import { accessTokenCookieOptions, getCurrentOrganization, toPublicEmployee } from "../utils/auth";
import {
  signAccessToken,
  signRefreshToken,
  verifyOnboardingToken,
  type OnboardingTokenPayload,
} from "../utils/jwt";
import { sendOtpSms } from "../utils/sms";
import { generateOtp, hashOtp, verifyOtp as compareOtp } from "../utils/otp";
import { hashPassword } from "../utils/password";
import { isStrongPassword, isValidContactNumber, isValidEmployeeName, isValidOtp } from "../utils/validation";

const TITLES = ["Mr", "Mrs", "Ms"] as const;
const INVALID_LINK_MESSAGE = "This invitation link is no longer valid. Please ask your admin to resend it.";
const INVALID_OTP_MESSAGE = "Invalid OTP. Please try again.";
const EXPIRED_OTP_MESSAGE = "This OTP has expired. Please request a new one.";
const OTP_RESEND_COOLDOWN_MESSAGE = "Please wait before requesting another OTP.";
const DEFAULT_COUNTRY_CODE = "+91";

// One flat token covers this entire 4-step flow (see
// user-stories/011-employee-onboarding.md's Open Questions for why) — every
// endpoint below re-verifies it independently, the same "guard function
// returns {payload, row} or writes the error response itself" shape as
// registration.controller.ts's requireRegistrationUser.
async function requireOnboardingEmployee(
  req: Request,
  res: Response
): Promise<{ payload: OnboardingTokenPayload; employee: Employee } | null> {
  const token = typeof req.body?.token === "string" ? req.body.token : "";

  const payload = token ? verifyOnboardingToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: INVALID_LINK_MESSAGE });
    return null;
  }

  const employee = await Employee.findByPk(payload.employeeId);
  if (!employee || employee.email !== payload.email || employee.invitationStatus === "registered") {
    res.status(401).json({ error: INVALID_LINK_MESSAGE });
    return null;
  }

  return { payload, employee };
}

export async function verifyOnboardingTokenHandler(req: Request, res: Response): Promise<void> {
  const context = await requireOnboardingEmployee(req, res);
  if (!context) return;
  const { employee } = context;

  // The invite link itself is the email-ownership proof — there's no
  // separate email-OTP step in this flow (unlike self-registration), so
  // emailVerifiedAt is set the first time a link for this employee is
  // successfully opened, not gated behind any further action.
  if (!employee.emailVerifiedAt) {
    employee.emailVerifiedAt = new Date();
    await employee.save();
  }

  res.status(200).json({
    email: employee.email,
    title: employee.title,
    firstName: employee.firstName,
    lastName: employee.lastName,
  });
}

export async function setOnboardingPassword(req: Request, res: Response): Promise<void> {
  const context = await requireOnboardingEmployee(req, res);
  if (!context) return;
  const { employee } = context;

  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!isStrongPassword(password)) {
    res.status(400).json({ error: "Password does not meet the strength requirements." });
    return;
  }

  employee.passwordHash = await hashPassword(password);
  await employee.save();

  res.status(200).json({ message: "Password saved." });
}

export async function updateOnboardingProfile(req: Request, res: Response): Promise<void> {
  const context = await requireOnboardingEmployee(req, res);
  if (!context) return;
  const { employee } = context;

  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
  const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";

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

  employee.title = title as (typeof TITLES)[number];
  employee.firstName = firstName;
  employee.lastName = lastName;
  employee.updatedBy = employee.id;
  await employee.save();

  res.status(200).json({ message: "Profile saved." });
}

export async function setOnboardingMobile(req: Request, res: Response): Promise<void> {
  const context = await requireOnboardingEmployee(req, res);
  if (!context) return;
  const { employee } = context;

  const countryCode = typeof req.body?.countryCode === "string" ? req.body.countryCode.trim() : DEFAULT_COUNTRY_CODE;
  const contactNumber = typeof req.body?.contactNumber === "string" ? req.body.contactNumber.trim() : "";

  if (!isValidContactNumber(contactNumber)) {
    res.status(400).json({ error: "Enter a valid contact number." });
    return;
  }

  const existing = await Employee.findOne({
    where: { countryCode, contactNumber, id: { [Op.ne]: employee.id } },
  });
  if (existing) {
    res.status(409).json({ error: "This contact number is already in use." });
    return;
  }

  employee.countryCode = countryCode;
  employee.contactNumber = contactNumber;
  employee.updatedBy = employee.id;
  await employee.save();

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + env.auth.otpExpiryMinutes * 60 * 1000);
  await Otp.create({ purpose: "mobile_verification", identifier: contactNumber, otpHash, expiresAt });
  await sendOtpSms(contactNumber, otp);

  res.status(200).json({ message: "OTP sent to your mobile number." });
}

export async function sendOnboardingMobileOtp(req: Request, res: Response): Promise<void> {
  const context = await requireOnboardingEmployee(req, res);
  if (!context) return;
  const { employee } = context;

  if (!employee.contactNumber) {
    res.status(400).json({ error: "Enter your mobile number first." });
    return;
  }

  const cooldownStart = new Date(Date.now() - env.auth.otpResendCooldownSeconds * 1000);
  const recentOtp = await Otp.findOne({
    where: {
      purpose: "mobile_verification",
      identifier: employee.contactNumber,
      consumedAt: null,
      createdAt: { [Op.gt]: cooldownStart },
    },
    order: [["createdAt", "DESC"]],
  });
  if (recentOtp) {
    res.status(429).json({ error: OTP_RESEND_COOLDOWN_MESSAGE });
    return;
  }

  await Otp.update(
    { consumedAt: new Date() },
    { where: { purpose: "mobile_verification", identifier: employee.contactNumber, consumedAt: null } }
  );

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + env.auth.otpExpiryMinutes * 60 * 1000);
  await Otp.create({ purpose: "mobile_verification", identifier: employee.contactNumber, otpHash, expiresAt });
  await sendOtpSms(employee.contactNumber, otp);

  res.status(200).json({ message: "OTP sent to your mobile number." });
}

export async function verifyOnboardingMobileOtp(req: Request, res: Response): Promise<void> {
  const context = await requireOnboardingEmployee(req, res);
  if (!context) return;
  const { employee } = context;

  const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
  if (!employee.contactNumber || !isValidOtp(otp)) {
    res.status(400).json({ error: INVALID_OTP_MESSAGE });
    return;
  }

  const otpRecord = await Otp.findOne({
    where: { purpose: "mobile_verification", identifier: employee.contactNumber, consumedAt: null },
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

  otpRecord.verifiedAt = new Date();
  otpRecord.consumedAt = new Date();
  await otpRecord.save();

  employee.mobileVerifiedAt = new Date();
  await employee.save();

  res.status(200).json({ message: "Mobile number verified." });
}

export async function completeOnboarding(req: Request, res: Response): Promise<void> {
  const context = await requireOnboardingEmployee(req, res);
  if (!context) return;
  const { employee } = context;

  const organization = await getCurrentOrganization(employee);
  if (!organization) {
    res.status(401).json({ error: INVALID_LINK_MESSAGE });
    return;
  }

  employee.invitationStatus = "registered";
  await employee.save();

  const accessToken = signAccessToken(employee.id);
  const refreshToken = signRefreshToken(employee.id);
  res.cookie(env.auth.cookieName, accessToken, accessTokenCookieOptions());

  res.status(200).json({
    user: toPublicEmployee(employee),
    organization,
    accessToken,
    refreshToken,
  });
}
