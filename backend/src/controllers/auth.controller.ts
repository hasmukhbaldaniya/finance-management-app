import type { Request, Response } from "express";
import { Op } from "sequelize";
import { env } from "../config/env";
import type { AuthenticatedRequest } from "../middleware/require-auth";
import { Employee, Otp } from "../models";
import { accessTokenCookieOptions, getCurrentOrganization, isOrganizationOwner, toPublicEmployee } from "../utils/auth";
import { signAccessToken, signResetToken, verifyResetToken } from "../utils/jwt";
import { sendOtpEmail } from "../utils/mailer";
import { generateOtp, hashOtp, verifyOtp as compareOtp } from "../utils/otp";
import { hashPassword, verifyPassword } from "../utils/password";
import { isEmail, isStrongPassword, isValidIdentifier, isValidOtp, normalizePhone } from "../utils/validation";

const INVALID_CREDENTIALS_MESSAGE = "Invalid email/phone number or password.";
const EMAIL_NOT_REGISTERED_MESSAGE = "This email is not registered.";
const OTP_SENT_MESSAGE = "An OTP has been sent to your email.";

export async function login(req: Request, res: Response): Promise<void> {
  const identifier = typeof req.body?.identifier === "string" ? req.body.identifier.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!identifier || !password || !isValidIdentifier(identifier)) {
    res.status(400).json({ error: INVALID_CREDENTIALS_MESSAGE });
    return;
  }

  const employee = await Employee.findOne({
    where: { [Op.or]: [{ email: identifier }, { contactNumber: normalizePhone(identifier) }] },
  });

  // A still-pending invitee (or a self-registered account that hasn't
  // finished the wizard) has no passwordHash yet — fail cleanly, not by
  // throwing on a null hash.
  const passwordMatches = employee?.passwordHash ? await verifyPassword(password, employee.passwordHash) : false;

  if (!employee || !passwordMatches) {
    res.status(401).json({ error: INVALID_CREDENTIALS_MESSAGE });
    return;
  }

  const token = signAccessToken(employee.id);
  res.cookie(env.auth.cookieName, token, accessTokenCookieOptions());
  res.status(200).json({ user: toPublicEmployee(employee) });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(env.auth.cookieName, { ...accessTokenCookieOptions(), maxAge: undefined });
  res.status(200).json({ message: "Logged out." });
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  const employee = await Employee.findByPk(req.userId);
  if (!employee) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  const organization = await getCurrentOrganization(employee);
  const isOwner = organization ? await isOrganizationOwner(employee.id, organization.id) : false;
  res.status(200).json({ user: toPublicEmployee(employee), organization, isOwner });
}

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

  if (!isEmail(email)) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }

  const employee = await Employee.findOne({ where: { email } });

  if (!employee) {
    res.status(404).json({ error: EMAIL_NOT_REGISTERED_MESSAGE });
    return;
  }

  const cooldownStart = new Date(Date.now() - env.auth.otpResendCooldownSeconds * 1000);
  const recentOtp = await Otp.findOne({
    where: { purpose: "password_reset", identifier: email, consumedAt: null, createdAt: { [Op.gt]: cooldownStart } },
    order: [["createdAt", "DESC"]],
  });

  if (!recentOtp) {
    await Otp.update(
      { consumedAt: new Date() },
      { where: { purpose: "password_reset", identifier: email, consumedAt: null } }
    );

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + env.auth.otpExpiryMinutes * 60 * 1000);

    await Otp.create({ purpose: "password_reset", identifier: email, otpHash, expiresAt });
    await sendOtpEmail(email, otp);
  }

  res.status(200).json({ message: OTP_SENT_MESSAGE });
}

export async function verifyOtpHandler(req: Request, res: Response): Promise<void> {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

  if (!isEmail(email) || !isValidOtp(otp)) {
    res.status(400).json({ error: "Invalid OTP. Please try again." });
    return;
  }

  const otpRecord = await Otp.findOne({
    where: { purpose: "password_reset", identifier: email, consumedAt: null },
    order: [["createdAt", "DESC"]],
  });

  if (!otpRecord) {
    res.status(400).json({ error: "Invalid OTP. Please try again." });
    return;
  }

  if (otpRecord.expiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: "This OTP has expired. Please request a new one." });
    return;
  }

  const matches = await compareOtp(otp, otpRecord.otpHash);
  if (!matches) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    res.status(400).json({ error: "Invalid OTP. Please try again." });
    return;
  }

  otpRecord.verifiedAt = new Date();
  await otpRecord.save();

  const resetToken = signResetToken(email, otpRecord.id);
  res.status(200).json({ resetToken });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const resetToken = typeof req.body?.resetToken === "string" ? req.body.resetToken : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please start over.";

  const payload = resetToken ? verifyResetToken(resetToken) : null;
  if (!payload) {
    res.status(401).json({ error: SESSION_EXPIRED_MESSAGE });
    return;
  }

  if (!isStrongPassword(newPassword)) {
    res.status(400).json({ error: "Password does not meet the strength requirements." });
    return;
  }

  const otpRecord = await Otp.findByPk(payload.otpId);
  if (
    !otpRecord ||
    otpRecord.purpose !== "password_reset" ||
    otpRecord.identifier !== payload.email ||
    !otpRecord.verifiedAt ||
    otpRecord.consumedAt
  ) {
    res.status(401).json({ error: SESSION_EXPIRED_MESSAGE });
    return;
  }

  const employee = await Employee.findOne({ where: { email: payload.email } });
  if (!employee) {
    res.status(401).json({ error: SESSION_EXPIRED_MESSAGE });
    return;
  }

  employee.passwordHash = await hashPassword(newPassword);
  await employee.save();

  otpRecord.consumedAt = new Date();
  await otpRecord.save();

  res.status(200).json({ message: "Password reset successful. Please log in." });
}
