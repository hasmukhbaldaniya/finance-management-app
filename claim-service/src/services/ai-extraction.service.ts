import { env } from "../config/env";
import type { CategoryField } from "../models";

// A thin HTTP client for the standalone ai-service microservice (023's own
// "dedicated service" requirement, taken literally — a genuinely separate
// backend process, not just a separate module in this codebase). This file
// used to hold the real Anthropic call directly; that logic now lives in
// ai-service/src/services/anthropic-extraction.ts. Per Phase 4 of
// docs/PLANS/microservices-plan.md, ai-service now owns writing every call to
// its own AiExtractionLog (its own MySQL database) — this module just passes
// the two correlation keys (claimInvoiceFileId/pageNumber) it needs to do
// that, and separately exposes listExtractionLogs for the status/dedup reads
// claim-ai.controller.ts used to do against a local AiExtractionLog table.

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

export type ExtractionLogEntry = {
  claimInvoiceFileId: number;
  pageNumber: number | null;
  status: "pending" | "completed" | "failed";
};

function isErrorBody(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && typeof (value as { error?: unknown }).error === "string";
}

function authHeaders(): Record<string, string> {
  return env.aiService.internalApiKey ? { "X-Internal-Api-Key": env.aiService.internalApiKey } : {};
}

// No retry/circuit-breaker sits in front of this call — a wedged ai-service
// must not be able to hang a claim-service request forever. Extraction gets
// a longer budget than the log lookup since it's a real vision-model call,
// not a simple DB read.
const EXTRACTION_TIMEOUT_MS = 30_000;
const LOG_LOOKUP_TIMEOUT_MS = 10_000;

function isTimeout(err: unknown): boolean {
  return err instanceof Error && err.name === "TimeoutError";
}

// `documentBase64` is either a single-page/whole-image or a standalone PDF
// (one page, or several merged pages — see claim-ai.controller.ts's
// Merge/Unmerge) built via pdf-lib, never rasterized to an image ourselves
// — the service's own Claude vision integration accepts PDF documents
// natively. `claimInvoiceFileId`/`pageNumber` let ai-service write its own
// audit-log row keyed the same way claim-service itself correlates a
// resulting Expense back to its source (sourceInvoiceFileId/sourcePageNumber).
export async function extractInvoiceData(params: {
  documentBase64: string;
  mediaType: "application/pdf" | "image/jpeg" | "image/png";
  categories: CategoryForExtraction[];
  claimInvoiceFileId: number;
  pageNumber: number | null;
}): Promise<AiExtractionResult> {
  let response: Response;
  try {
    response = await fetch(`${env.aiService.url}/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(EXTRACTION_TIMEOUT_MS),
    });
  } catch (err) {
    if (isTimeout(err)) return { error: "The AI/ML service took too long to respond." };
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

// Replaces what used to be a local `AiExtractionLog.findAll` query —
// claim-ai.controller.ts uses this both to skip invoice files that already
// have a logged extraction attempt (runExtractionForClaim's dedup) and to
// report processing completion (getProcessingStatus's poll).
export async function listExtractionLogs(claimInvoiceFileIds: number[]): Promise<ExtractionLogEntry[]> {
  if (claimInvoiceFileIds.length === 0) return [];

  let response: Response;
  try {
    response = await fetch(`${env.aiService.url}/api/extraction-logs?claimInvoiceFileIds=${claimInvoiceFileIds.join(",")}`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(LOG_LOOKUP_TIMEOUT_MS),
    });
  } catch (err) {
    if (isTimeout(err)) throw new Error("The AI/ML service took too long to respond.");
    throw new Error(`Couldn't reach the AI/ML service — ${err instanceof Error ? err.message : "connection failed"}.`);
  }

  if (!response.ok) {
    throw new Error("AI/ML service extraction-log lookup failed.");
  }

  const body = (await response.json()) as { logs: ExtractionLogEntry[] };
  return body.logs;
}
