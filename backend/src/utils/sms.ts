// No SMS provider is configured for this skeleton — logging is the dev stand-in,
// the same way src/utils/mailer.ts started before real SMTP was wired in.
// Swap this function's body for a real provider (Twilio/MSG91/etc.) before production.
export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  console.log(`[sms] Mobile verification OTP for ${phone}: ${otp}`);
}
