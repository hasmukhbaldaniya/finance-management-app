import { sendWhatsApp } from "../services/communications.service";

// Mobile-verification OTP delivery now goes through communications-service's
// WhatsApp channel instead of a local console.log stub — that channel is
// itself still a stub too (no real provider chosen yet, see
// communications-service/src/services/whatsapp.service.ts), so behavior is
// unchanged today (every send is logged, nothing is actually delivered) but
// the wiring is now in place for whichever provider gets picked later.
// Function name/signature kept as sendOtpSms so every call site (registration,
// onboarding, employee-profile mobile-change flows) needed zero changes.
export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  await sendWhatsApp({
    to: phone,
    message: `Your OTP is ${otp}.`,
  });
}
