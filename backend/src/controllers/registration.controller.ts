import type { Request, Response } from "express";
import { Op } from "sequelize";
import { env } from "../config/env";
import { Organization, OrganizationMember, Otp, Role, User } from "../models";
import { accessTokenCookieOptions, getCurrentOrganization, toPublicUser } from "../utils/auth";
import { COMPANY_ADMIN_ROLE_NAME, MEMBERS_ROLE_NAME, MEMBERS_ROLE_PRIVILEGES, PRIVILEGE_KEYS } from "../utils/constants/role.constant";
import {
  signAccessToken,
  signRefreshToken,
  signRegistrationToken,
  verifyRegistrationToken,
  type RegistrationTokenPayload,
} from "../utils/jwt";
import { sendOtpEmail } from "../utils/mailer";
import { generateOtp, hashOtp, verifyOtp as compareOtp } from "../utils/otp";
import { hashPassword } from "../utils/password";
import { sendOtpSms } from "../utils/sms";
import { isEmail, isPhone, isValidGstNumber, isValidName, isValidOtp, isStrongPassword, normalizePhone } from "../utils/validation";

const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please start over.";
const INVALID_OTP_MESSAGE = "Invalid OTP. Please try again.";
const EXPIRED_OTP_MESSAGE = "This OTP has expired. Please request a new one.";

async function requireRegistrationUser(
  req: Request,
  res: Response
): Promise<{ payload: RegistrationTokenPayload; user: User } | null> {
  const registrationToken = typeof req.body?.registrationToken === "string" ? req.body.registrationToken : "";

  const payload = registrationToken ? verifyRegistrationToken(registrationToken) : null;
  if (!payload) {
    res.status(401).json({ error: SESSION_EXPIRED_MESSAGE });
    return null;
  }

  const user = await User.findByPk(payload.userId);
  if (!user || user.email !== payload.email || !user.emailVerifiedAt || user.registrationCompletedAt) {
    res.status(401).json({ error: SESSION_EXPIRED_MESSAGE });
    return null;
  }

  return { payload, user };
}

export async function createRegistration(req: Request, res: Response): Promise<void> {
  const organizationName = typeof req.body?.organizationName === "string" ? req.body.organizationName.trim() : "";
  const gstNumber = typeof req.body?.gstNumber === "string" ? req.body.gstNumber.trim().toUpperCase() : "";
  const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
  const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (organizationName.length < 2 || organizationName.length > 150) {
    res.status(400).json({ error: "Enter a valid organization name." });
    return;
  }
  if (!isValidGstNumber(gstNumber)) {
    res.status(400).json({ error: "Enter a valid GST number." });
    return;
  }
  if (!isValidName(firstName) || !isValidName(lastName)) {
    res.status(400).json({ error: "Enter a valid first and last name." });
    return;
  }
  if (!isEmail(email)) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }
  if (!isStrongPassword(password)) {
    res.status(400).json({ error: "Password does not meet the strength requirements." });
    return;
  }

  const [gstTaken, emailTaken] = await Promise.all([
    Organization.findOne({ where: { gstNumber } }),
    User.findOne({ where: { email } }),
  ]);

  if (gstTaken) {
    res.status(409).json({ error: "This GST number is already registered." });
    return;
  }
  if (emailTaken) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await hashPassword(password);
  const organization = await Organization.create({ name: organizationName, gstNumber });
  const user = await User.create({
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    email,
    passwordHash,
    phone: null,
    emailVerifiedAt: null,
    mobileVerifiedAt: null,
    activeOrganizationId: organization.id,
  });
  const companyAdminRole = await Role.create({
    organizationId: organization.id,
    name: COMPANY_ADMIN_ROLE_NAME,
    isDefault: true,
    privileges: [...PRIVILEGE_KEYS],
  });
  await Role.create({
    organizationId: organization.id,
    name: MEMBERS_ROLE_NAME,
    isDefault: true,
    privileges: MEMBERS_ROLE_PRIVILEGES,
  });
  await OrganizationMember.create({
    organizationId: organization.id,
    userId: user.id,
    role: "owner",
    roleId: companyAdminRole.id,
  });

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + env.auth.otpExpiryMinutes * 60 * 1000);
  await Otp.create({ purpose: "email_verification", identifier: email, otpHash, expiresAt });
  await sendOtpEmail(email, otp, "email_verification");

  res.status(201).json({ message: "Verification code sent to your email.", email });
}

export async function resendRegistrationEmailOtp(req: Request, res: Response): Promise<void> {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

  if (!isEmail(email)) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    res.status(404).json({ error: "This email is not registered." });
    return;
  }
  if (user.emailVerifiedAt) {
    res.status(400).json({ error: "This email is already verified." });
    return;
  }

  const cooldownStart = new Date(Date.now() - env.auth.otpResendCooldownSeconds * 1000);
  const recentOtp = await Otp.findOne({
    where: { purpose: "email_verification", identifier: email, consumedAt: null, createdAt: { [Op.gt]: cooldownStart } },
    order: [["createdAt", "DESC"]],
  });

  if (!recentOtp) {
    await Otp.update(
      { consumedAt: new Date() },
      { where: { purpose: "email_verification", identifier: email, consumedAt: null } }
    );

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + env.auth.otpExpiryMinutes * 60 * 1000);
    await Otp.create({ purpose: "email_verification", identifier: email, otpHash, expiresAt });
    await sendOtpEmail(email, otp, "email_verification");
  }

  res.status(200).json({ message: "Verification code sent to your email." });
}

export async function verifyRegistrationEmailOtp(req: Request, res: Response): Promise<void> {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

  if (!isEmail(email) || !isValidOtp(otp)) {
    res.status(400).json({ error: INVALID_OTP_MESSAGE });
    return;
  }

  const otpRecord = await Otp.findOne({
    where: { purpose: "email_verification", identifier: email, consumedAt: null },
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

  const user = await User.findOne({ where: { email } });
  if (!user) {
    res.status(401).json({ error: SESSION_EXPIRED_MESSAGE });
    return;
  }

  otpRecord.verifiedAt = new Date();
  otpRecord.consumedAt = new Date();
  await otpRecord.save();

  user.emailVerifiedAt = new Date();
  await user.save();

  const registrationToken = signRegistrationToken(user.id, email);
  res.status(200).json({ registrationToken });
}

export async function setRegistrationMobile(req: Request, res: Response): Promise<void> {
  const context = await requireRegistrationUser(req, res);
  if (!context) return;
  const { user } = context;

  const mobileNumber = typeof req.body?.mobileNumber === "string" ? req.body.mobileNumber.trim() : "";
  if (!isPhone(mobileNumber)) {
    res.status(400).json({ error: "Enter a valid India mobile number." });
    return;
  }

  const normalized = normalizePhone(mobileNumber);
  const existing = await User.findOne({ where: { phone: normalized, id: { [Op.ne]: user.id } } });
  if (existing) {
    res.status(409).json({ error: "This mobile number is already in use." });
    return;
  }

  user.phone = normalized;
  await user.save();

  res.status(200).json({ message: "Mobile number saved." });
}

export async function sendRegistrationMobileOtp(req: Request, res: Response): Promise<void> {
  const context = await requireRegistrationUser(req, res);
  if (!context) return;
  const { user } = context;

  if (!user.phone) {
    res.status(400).json({ error: "Enter your mobile number first." });
    return;
  }

  const cooldownStart = new Date(Date.now() - env.auth.otpResendCooldownSeconds * 1000);
  const recentOtp = await Otp.findOne({
    where: {
      purpose: "mobile_verification",
      identifier: user.phone,
      consumedAt: null,
      createdAt: { [Op.gt]: cooldownStart },
    },
    order: [["createdAt", "DESC"]],
  });

  if (!recentOtp) {
    await Otp.update(
      { consumedAt: new Date() },
      { where: { purpose: "mobile_verification", identifier: user.phone, consumedAt: null } }
    );

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + env.auth.otpExpiryMinutes * 60 * 1000);
    await Otp.create({ purpose: "mobile_verification", identifier: user.phone, otpHash, expiresAt });
    await sendOtpSms(user.phone, otp);
  }

  res.status(200).json({ message: "OTP sent to your mobile number." });
}

export async function verifyRegistrationMobileOtp(req: Request, res: Response): Promise<void> {
  const context = await requireRegistrationUser(req, res);
  if (!context) return;
  const { user } = context;

  const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
  if (!user.phone || !isValidOtp(otp)) {
    res.status(400).json({ error: INVALID_OTP_MESSAGE });
    return;
  }

  const otpRecord = await Otp.findOne({
    where: { purpose: "mobile_verification", identifier: user.phone, consumedAt: null },
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

  user.mobileVerifiedAt = new Date();
  await user.save();

  res.status(200).json({ message: "Mobile number verified." });
}

export async function completeRegistration(req: Request, res: Response): Promise<void> {
  const context = await requireRegistrationUser(req, res);
  if (!context) return;
  const { user } = context;

  const organization = await getCurrentOrganization(user);
  if (!organization) {
    res.status(401).json({ error: SESSION_EXPIRED_MESSAGE });
    return;
  }

  user.registrationCompletedAt = new Date();
  await user.save();

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  res.cookie(env.auth.cookieName, accessToken, accessTokenCookieOptions());

  res.status(200).json({
    user: toPublicUser(user),
    organization,
    accessToken,
    refreshToken,
  });
}
