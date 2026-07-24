import { env } from "../config/env";

// A thin HTTP client for the standalone communications-service microservice
// (docs/PLANS/microservices-plan.md's Phase 1) — mirrors ai-extraction.service.ts's
// own shape exactly. This used to be three separate nodemailer transporters
// (mailer.ts, employee-invite-mailer.ts, split-request-mailer.ts) plus a
// console.log stub (sms.ts); those files now just build the subject/body
// text and call sendEmail/sendWhatsApp here instead of talking to SMTP
// directly. Failures are re-thrown, matching this codebase's existing "send
// failures throw straight out of the controller" posture — callers don't
// need new error-handling logic, just a different thing being called.

function isErrorBody(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && typeof (value as { error?: unknown }).error === "string";
}

async function postNotification(path: string, body: Record<string, unknown>): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${env.communicationsService.url}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.communicationsService.internalApiKey ? { "X-Internal-Api-Key": env.communicationsService.internalApiKey } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Couldn't reach communications-service — ${err instanceof Error ? err.message : "connection failed"}.`);
  }

  if (!response.ok) {
    const responseBody: unknown = await response.json().catch(() => null);
    throw new Error(isErrorBody(responseBody) ? responseBody.error : "communications-service call failed.");
  }
}

export async function sendEmail(params: { to: string; subject: string; text: string }): Promise<void> {
  await postNotification("/api/notifications/email", params);
}

export async function sendWhatsApp(params: { to: string; message: string }): Promise<void> {
  await postNotification("/api/notifications/whatsapp", params);
}
