import nodemailer from "nodemailer";
import { env } from "../config/env";

// Same transporter setup as employee-invite-mailer.ts's own emails — kept as
// its own module since it's a different domain (Split Claim requests, not
// invites). Best-effort: a send failure here doesn't block the split
// request itself from being created (025's own posture, matching how OTP/
// invite emails already aren't transactional with the action they notify
// about in this codebase).
const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.password,
  },
});

export async function sendSplitRequestEmail(params: {
  email: string;
  recipientFirstName: string;
  requesterName: string;
  categoryName: string;
  amount: string;
  inboxLink: string;
}): Promise<void> {
  const { email, recipientFirstName, requesterName, categoryName, amount, inboxLink } = params;
  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: `${requesterName} wants to split an expense with you`,
    text: `Hi ${recipientFirstName},\n\n${requesterName} has asked you to cover a ₹${amount} share of a ${categoryName} expense. Review and respond here:\n\n${inboxLink}`,
  });
}
