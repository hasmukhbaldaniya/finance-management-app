// A dev console.log stub, same rationale as src/utils/sms.ts: unlike
// src/utils/mailer.ts's OTP emails, there is genuinely no invite-acceptance URL
// to link to yet (see user-stories/008-employee-invitation.md's Out of Scope —
// that flow is a future story), so wiring this through the real SMTP transporter
// would just send a broken/placeholder email. Swap this for a real template once
// the accept-invite flow exists and has a real URL to send.
export async function sendEmployeeInviteEmail(email: string, firstName: string): Promise<void> {
  console.log(`[email] Invitation for ${firstName} <${email}> — accept-invite flow not yet built.`);
}
