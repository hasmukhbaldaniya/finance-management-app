import { sendEmail } from "../services/communications.service";

// Kept as its own module since it's a different domain (Split Claim
// requests, not invites) — same reasoning as before communications-service
// existed. Best-effort: a send failure here doesn't block the split request
// itself from being created (025's own posture, matching how OTP/invite
// emails already aren't transactional with the action they notify about in
// this codebase).
export async function sendSplitRequestEmail(params: {
  email: string;
  recipientFirstName: string;
  requesterName: string;
  categoryName: string;
  amount: string;
  inboxLink: string;
}): Promise<void> {
  const { email, recipientFirstName, requesterName, categoryName, amount, inboxLink } = params;
  await sendEmail({
    to: email,
    subject: `${requesterName} wants to split an expense with you`,
    text: `Hi ${recipientFirstName},\n\n${requesterName} has asked you to cover a ₹${amount} share of a ${categoryName} expense. Review and respond here:\n\n${inboxLink}`,
  });
}
