// No WhatsApp provider is configured yet — logging is the dev stand-in, the
// same posture backend/src/utils/sms.ts had before this codebase picked a
// real SMS/WhatsApp provider (per explicit instruction, deferred rather than
// picked here). Swap this function's body for a real provider (Twilio/Meta
// Cloud API/MSG91/etc.) once one is chosen — every caller already goes
// through notification.controller.ts, so this is the one place that changes.
export async function sendWhatsApp(params: { to: string; message: string }): Promise<void> {
  console.log(`[whatsapp:stub] to=${params.to} message=${params.message}`);
}
