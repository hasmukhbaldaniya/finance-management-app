import { Schema, model } from "mongoose";

export type NotificationChannel = "email" | "whatsapp";
export type NotificationStatus = "sent" | "failed" | "stubbed";

export type NotificationLogDocument = {
  channel: NotificationChannel;
  to: string;
  subject: string | null;
  body: string;
  status: NotificationStatus;
  providerResponse: unknown;
  errorMessage: string | null;
  requestedAt: Date;
  respondedAt: Date;
};

// One collection for every channel (email today, WhatsApp once a real
// provider is wired up), distinguished by `channel` — same "one table,
// discriminant column" shape backend/CLAUDE.md's Otp model already uses for
// its own multiple purposes, applied here to Mongo instead of Postgres.
// `status: "stubbed"` (distinct from "sent"/"failed") records that no real
// provider was called at all — see services/whatsapp.service.ts.
const notificationLogSchema = new Schema<NotificationLogDocument>(
  {
    channel: { type: String, enum: ["email", "whatsapp"], required: true },
    to: { type: String, required: true },
    subject: { type: String, default: null },
    body: { type: String, required: true },
    status: { type: String, enum: ["sent", "failed", "stubbed"], required: true },
    providerResponse: { type: Schema.Types.Mixed, default: null },
    errorMessage: { type: String, default: null },
    requestedAt: { type: Date, required: true },
    respondedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// This collection is a pure write-audit trail today (nothing queries it by
// recipient yet) — added ahead of that need rather than after, since an
// unindexed `to` lookup over every email/WhatsApp ever sent would be a full
// collection scan the moment anyone builds a "notifications for this
// employee" view.
notificationLogSchema.index({ to: 1, channel: 1, createdAt: -1 });

export const NotificationLog = model<NotificationLogDocument>("NotificationLog", notificationLogSchema);
