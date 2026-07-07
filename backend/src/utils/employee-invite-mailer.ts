import nodemailer from "nodemailer";
import { env } from "../config/env";

// Same transporter setup as src/utils/mailer.ts's OTP emails — kept as a
// separate module (not merged into mailer.ts) since it's conceptually a
// different domain (employee invites, not auth OTPs), matching how
// employee-invite-mailer.ts already existed as its own file. This used to be
// a console.log dev stub because there was no real accept-invite URL to send
// (see user-stories/008-employee-invitation.md's Open Questions) — now that
// user-stories/011-employee-onboarding.md's onboarding link exists, it sends
// a real email.
const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.password,
  },
});

export async function sendEmployeeInviteEmail(email: string, firstName: string, onboardingLink: string): Promise<void> {
  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: "You're invited to join your organization",
    text: `Hi ${firstName},\n\nYou've been invited to join your organization on Finance Management. Click the link below to set up your account:\n\n${onboardingLink}\n\nThis link expires in ${env.auth.onboardingTokenExpiresIn}.`,
  });
}
