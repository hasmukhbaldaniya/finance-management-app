import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

// Local-disk storage for uploaded invoice bills (023's Upload Invoices story)
// — this codebase has no cloud storage integration anywhere yet, and a
// dedicated bucket is out of scope for this story; files live under
// backend/uploads/claims/<claimId>/, outside dist/ and never served by a
// public static path (see claim-ai.controller.ts's own authenticated
// getInvoiceFileContent handler) since bills carry real financial/PII data.
const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads", "claims");

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-100);
}

export async function saveInvoiceFile(claimId: number, buffer: Buffer, originalFileName: string): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, String(claimId));
  await mkdir(dir, { recursive: true });
  const storedName = `${randomUUID()}-${sanitizeFileName(originalFileName)}`;
  await writeFile(path.join(dir, storedName), buffer);
  return path.join(String(claimId), storedName);
}

export async function readInvoiceFile(storedPath: string): Promise<Buffer> {
  return readFile(path.join(UPLOAD_ROOT, storedPath));
}
