import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.password,
  },
});

const OTP_EMAIL_SUBJECTS = {
  password_reset: "Your password reset OTP",
  email_verification: "Verify your email address",
} as const;

export async function sendOtpEmail(
  email: string,
  otp: string,
  purpose: keyof typeof OTP_EMAIL_SUBJECTS = "password_reset"
): Promise<void> {
  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: OTP_EMAIL_SUBJECTS[purpose],
    text: `Your OTP is ${otp}. It expires in ${env.auth.otpExpiryMinutes} minutes.`,
  });
}
