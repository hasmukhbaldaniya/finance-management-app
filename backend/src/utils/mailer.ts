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

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: "Your password reset OTP",
    text: `Your OTP is ${otp}. It expires in ${env.auth.otpExpiryMinutes} minutes.`,
  });
}
