import { sendEmail } from "../services/communications.service";
import { env } from "../config/env";

const OTP_EMAIL_SUBJECTS = {
  password_reset: "Your password reset OTP",
  email_verification: "Verify your email address",
} as const;

export async function sendOtpEmail(
  email: string,
  otp: string,
  purpose: keyof typeof OTP_EMAIL_SUBJECTS = "password_reset"
): Promise<void> {
  await sendEmail({
    to: email,
    subject: OTP_EMAIL_SUBJECTS[purpose],
    text: `Your OTP is ${otp}. It expires in ${env.auth.otpExpiryMinutes} minutes.`,
  });
}
