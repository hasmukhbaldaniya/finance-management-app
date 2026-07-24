import { sendEmail } from "../services/communications.service";
import { env } from "../config/env";

// Kept as a separate module (not merged into mailer.ts) since it's
// conceptually a different domain (employee invites, not auth OTPs) — same
// reasoning as before communications-service existed, just delivering
// through that service's /api/notifications/email now instead of a local
// nodemailer transporter.
export async function sendEmployeeInviteEmail(email: string, firstName: string, onboardingLink: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "You're invited to join your organization",
    text: `Hi ${firstName},\n\nYou've been invited to join your organization on Finance Management. Click the link below to set up your account:\n\n${onboardingLink}\n\nThis link expires in ${env.auth.onboardingTokenExpiresIn}.`,
  });
}
