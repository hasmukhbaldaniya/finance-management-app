import type { Request, Response } from "express";
import { extractInvoiceData } from "../services/anthropic-extraction";
import type { CategoryForExtraction, ExtractRequestBody } from "../types";

const VALID_MEDIA_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

function isCategoryForExtraction(value: unknown): value is CategoryForExtraction {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "number" && typeof record.name === "string" && Array.isArray(record.fields);
}

function parseBody(body: unknown): ExtractRequestBody | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  if (typeof record.documentBase64 !== "string" || !record.documentBase64) return null;
  if (typeof record.mediaType !== "string" || !VALID_MEDIA_TYPES.has(record.mediaType)) return null;
  if (!Array.isArray(record.categories) || !record.categories.every(isCategoryForExtraction)) return null;

  return {
    documentBase64: record.documentBase64,
    mediaType: record.mediaType as ExtractRequestBody["mediaType"],
    categories: record.categories,
  };
}

// POST /api/extract — the one endpoint this service exposes. Stateless: no
// database, no audit logging here (the caller — the main backend's
// AiExtractionLog — owns that), just "given this document and these
// categories, return a structured extraction."
export async function extract(req: Request, res: Response): Promise<void> {
  const parsed = parseBody(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid extraction request." });
    return;
  }

  const result = await extractInvoiceData(parsed);
  res.status(200).json(result);
}
