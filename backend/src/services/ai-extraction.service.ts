import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";
import type { CategoryField } from "../models";

// One well-defined place that talks to the AI/ML provider (023's own "The
// AI/ML Service" design section) — every call is logged by the caller
// (claim-ai.controller.ts) to AiExtractionLog regardless of outcome; this
// module only knows how to build the request and parse the response.

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
  // already uses — the model is asked for field *names*, resolved back to
  // ids here so callers never have to do that matching themselves.
  extractedFields: Record<string, string>;
  redFlags: AiExtractionRedFlag[];
  rawRequestSummary: Record<string, unknown>;
  rawModelResponse: Record<string, unknown>;
};

export type AiExtractionResult = AiExtractionSuccess | { error: string };

const EXTRACTION_TOOL_NAME = "record_extraction";

function buildToolSchema(): Anthropic.Tool {
  return {
    name: EXTRACTION_TOOL_NAME,
    description: "Record the result of reading one expense bill/invoice.",
    input_schema: {
      type: "object",
      properties: {
        suggestedCategoryName: {
          type: "string",
          description: "The exact name of the best-matching category from the provided list. Empty string if none fit.",
        },
        confidence: { type: "number", description: "How confident you are in the category match, from 0 to 1." },
        extractedFields: {
          type: "object",
          additionalProperties: { type: "string" },
          description:
            "Map of the matched category's field name (exactly as given) to the value you read from the bill, as a plain string. Omit any field you could not confidently read — do not guess.",
        },
        redFlags: {
          type: "array",
          description: "Only for the matched category's fields whose Red Flag mode is 'ai' — one entry per such field.",
          items: {
            type: "object",
            properties: {
              fieldName: { type: "string" },
              triggered: { type: "boolean" },
              reason: { type: "string" },
            },
            required: ["fieldName", "triggered", "reason"],
          },
        },
      },
      required: ["suggestedCategoryName", "confidence", "extractedFields", "redFlags"],
    },
  };
}

function describeCategoriesForPrompt(categories: CategoryForExtraction[]): string {
  return categories
    .map((category) => {
      const fieldLines = category.fields
        .map((field) => {
          const hints: string[] = [field.fieldType];
          if (field.config?.useAsClaimAmount === true) hints.push("this is the Claim Amount field — use the bill's final grand total, not a subtotal or line item");
          if (field.config?.useAsExpenseDate === true) hints.push("this is the Expense Date field");
          if (field.config?.useAsInvoiceNumber === true) hints.push("this is the Invoice/Bill Number field");
          if (field.redFlagMode === "ai" && field.redFlagValue) hints.push(`AI red flag check: "${field.redFlagValue}"`);
          if (field.tooltip) hints.push(field.tooltip);
          return `    - "${field.fieldName}" (${hints.join("; ")})`;
        })
        .join("\n");
      return `- "${category.name}"${category.description ? ` — ${category.description}` : ""}\n${fieldLines}`;
    })
    .join("\n");
}

function getClient(): Anthropic | null {
  if (!env.ai.apiKey) return null;
  return new Anthropic({ apiKey: env.ai.apiKey });
}

// `documentBase64` is either a single-page/whole-image or a standalone PDF
// (one page, or several merged pages — see claim-ai.controller.ts's
// Merge/Unmerge) rendered via pdf-lib, never rasterized to an image
// ourselves — Claude's vision API accepts PDF documents natively, which
// keeps text fidelity and avoids a native rasterization dependency.
export async function extractInvoiceData(params: {
  documentBase64: string;
  mediaType: "application/pdf" | "image/jpeg" | "image/png";
  categories: CategoryForExtraction[];
}): Promise<AiExtractionResult> {
  const { documentBase64, mediaType, categories } = params;

  const client = getClient();
  const promptText = `You are extracting data from one expense bill/invoice for an expense-claim system. Choose which of the following categories best matches this bill, then extract the values for that category's own fields, and evaluate any AI red flag checks that category's fields define.

Available categories:
${describeCategoriesForPrompt(categories)}

Call the ${EXTRACTION_TOOL_NAME} tool with your result. If nothing matches, use an empty suggestedCategoryName and leave extractedFields/redFlags empty.`;

  const contentBlock: Anthropic.Messages.ContentBlockParam =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: documentBase64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: documentBase64 } };

  const rawRequestSummary = {
    model: env.ai.model,
    mediaType,
    categoryNames: categories.map((category) => category.name),
    promptText,
  };

  if (!client) {
    return { error: "AI/ML service is not configured — set ANTHROPIC_API_KEY to enable real extraction." };
  }

  try {
    const response = await client.messages.create({
      model: env.ai.model,
      max_tokens: 2048,
      tools: [buildToolSchema()],
      tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: promptText }] }],
    });

    const toolUse = response.content.find((block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) {
      return { error: "AI/ML service returned no structured result." };
    }

    const input = toolUse.input as {
      suggestedCategoryName?: string;
      confidence?: number;
      extractedFields?: Record<string, string>;
      redFlags?: { fieldName: string; triggered: boolean; reason: string }[];
    };

    const matchedCategory = categories.find((category) => category.name.toLowerCase() === (input.suggestedCategoryName ?? "").toLowerCase()) ?? null;
    const fieldByName = new Map((matchedCategory?.fields ?? []).map((field) => [field.fieldName.toLowerCase(), field]));

    const extractedFields: Record<string, string> = {};
    Object.entries(input.extractedFields ?? {}).forEach(([name, value]) => {
      const field = fieldByName.get(name.toLowerCase());
      if (field && typeof value === "string" && value.trim()) extractedFields[String(field.id)] = value.trim();
    });

    const redFlags: AiExtractionRedFlag[] = (input.redFlags ?? [])
      .map((flag) => {
        const field = fieldByName.get(flag.fieldName.toLowerCase());
        return field ? { categoryFieldId: field.id, triggered: flag.triggered === true, reason: flag.reason ?? "" } : null;
      })
      .filter((flag): flag is AiExtractionRedFlag => flag !== null);

    return {
      suggestedCategoryId: matchedCategory?.id ?? null,
      confidence: typeof input.confidence === "number" ? input.confidence : null,
      extractedFields,
      redFlags,
      rawRequestSummary,
      rawModelResponse: input as unknown as Record<string, unknown>,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI/ML service call failed." };
  }
}
