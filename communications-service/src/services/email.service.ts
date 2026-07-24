import nodemailer from "nodemailer";
import { env } from "../config/env";

// Moved here from backend/src/utils/mailer.ts (and the near-identical
// transporter setup employee-invite-mailer.ts/split-request-mailer.ts each
// had their own copy of) — this service now owns the one SMTP transporter
// for the whole system, not three separate copies across mailer files that
// all read the same env vars.
const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.password,
  },
});

export async function sendEmail(params: { to: string; subject: string; text: string }): Promise<unknown> {
  const { to, subject, text } = params;
  return transporter.sendMail({ from: env.smtp.from, to, subject, text });
}
