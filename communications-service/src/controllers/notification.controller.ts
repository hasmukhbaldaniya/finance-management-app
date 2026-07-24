import type { Request, Response } from "express";
import { NotificationLog } from "../models/notification-log.model";
import { sendEmail } from "../services/email.service";
import { sendWhatsApp } from "../services/whatsapp.service";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Callers (auth-service, claim-service) build the actual subject/body copy
// themselves — this endpoint only knows how to deliver and log it, the same
// "one well-defined place that talks to the provider" split ai-service
// already established for AI/ML calls.
export async function sendEmailNotification(req: Request, res: Response): Promise<void> {
  const { to, subject, text } = req.body as { to?: unknown; subject?: unknown; text?: unknown };
  if (!isNonEmptyString(to) || !isNonEmptyString(subject) || !isNonEmptyString(text)) {
    res.status(400).json({ error: "to, subject, and text are all required." });
    return;
  }

  const requestedAt = new Date();
  try {
    const providerResponse = await sendEmail({ to, subject, text });
    await NotificationLog.create({
      channel: "email",
      to,
      subject,
      body: text,
      status: "sent",
      providerResponse,
      requestedAt,
      respondedAt: new Date(),
    });
    res.json({ status: "sent" });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Email send failed.";
    await NotificationLog.create({
      channel: "email",
      to,
      subject,
      body: text,
      status: "failed",
      errorMessage,
      requestedAt,
      respondedAt: new Date(),
    });
    res.status(502).json({ error: errorMessage });
  }
}

// Always logs `status: "stubbed"` until a real WhatsApp provider is wired
// into services/whatsapp.service.ts — never "sent", so a NotificationLog
// listing can't be misread as real delivery history.
export async function sendWhatsAppNotification(req: Request, res: Response): Promise<void> {
  const { to, message } = req.body as { to?: unknown; message?: unknown };
  if (!isNonEmptyString(to) || !isNonEmptyString(message)) {
    res.status(400).json({ error: "to and message are both required." });
    return;
  }

  const requestedAt = new Date();
  await sendWhatsApp({ to, message });
  await NotificationLog.create({
    channel: "whatsapp",
    to,
    body: message,
    status: "stubbed",
    requestedAt,
    respondedAt: new Date(),
  });
  res.json({ status: "stubbed" });
}
