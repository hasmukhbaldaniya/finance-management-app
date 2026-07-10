import { env } from "../config/env";
import type { CategoryField } from "../models";

// A thin HTTP client for the standalone ai-service microservice (023's own
// "dedicated service" requirement, taken literally — a genuinely separate
// backend process, not just a separate module in this codebase). This file
// used to hold the real Anthropic call directly; that logic now lives in
// ai-service/src/services/anthropic-extraction.ts. Every call is still
// logged by the caller (claim-ai.controller.ts) to AiExtractionLog
// regardless of outcome — this module only knows how to reach the service
// and shape its response.

export type CategoryForExtraction = {
  id: number;
  name: string;
  description: string | null;
  fields: Pick<CategoryField, "id" | "fieldName" | "fieldType" | "tooltip" | "config" | "redFlagMode" | "redFlagValue">[];
};

export type AiExtractionRedFlag = { categoryFieldId: number; triggered: boolean; reason: string };

export type AiExtractionSuccess = {
  suggestedCategoryId: number | null;
  confidence: number | null;
  // Keyed by CategoryField.id (string), same shape Expense.fieldValues
  // already uses — the service resolves field/category *names* back to ids
  // itself, so callers here never have to do that matching.
  extractedFields: Record<string, string>;
  redFlags: AiExtractionRedFlag[];
  rawRequestSummary: Record<string, unknown>;
  rawModelResponse: Record<string, unknown>;
};

export type AiExtractionResult = AiExtractionSuccess | { error: string };

function isErrorBody(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && typeof (value as { error?: unknown }).error === "string";
}

// `documentBase64` is either a single-page/whole-image or a standalone PDF
// (one page, or several merged pages — see claim-ai.controller.ts's
// Merge/Unmerge) built via pdf-lib, never rasterized to an image ourselves
// — the service's own Claude vision integration accepts PDF documents
// natively.
export async function extractInvoiceData(params: {
  documentBase64: string;
  mediaType: "application/pdf" | "image/jpeg" | "image/png";
  categories: CategoryForExtraction[];
}): Promise<AiExtractionResult> {
  let response: Response;
  try {
    response = await fetch(`${env.aiService.url}/api/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.aiService.internalApiKey ? { "X-Internal-Api-Key": env.aiService.internalApiKey } : {}),
      },
      body: JSON.stringify(params),
    });
  } catch (err) {
    return { error: `Couldn't reach the AI/ML service — ${err instanceof Error ? err.message : "connection failed"}.` };
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    return { error: isErrorBody(body) ? body.error : "AI/ML service call failed." };
  }
  if (body === null || typeof body !== "object") {
    return { error: "AI/ML service returned an invalid response." };
  }
  if (isErrorBody(body) && !("suggestedCategoryId" in body)) {
    return { error: body.error };
  }

  return body as AiExtractionSuccess;
}
