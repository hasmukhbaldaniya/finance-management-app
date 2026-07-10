// The wire contract with the main backend (backend/src/services/ai-extraction-client.ts
// must match this exactly — kept in sync by hand, the same convention this
// monorepo already uses for shared constants between frontend/backend).

export type CategoryFieldForExtraction = {
  id: number;
  fieldName: string;
  fieldType: string;
  tooltip: string | null;
  config: Record<string, unknown>;
  redFlagMode: string | null;
  redFlagValue: string | null;
};

export type CategoryForExtraction = {
  id: number;
  name: string;
  description: string | null;
  fields: CategoryFieldForExtraction[];
};

export type ExtractRequestBody = {
  documentBase64: string;
  mediaType: "application/pdf" | "image/jpeg" | "image/png";
  categories: CategoryForExtraction[];
};

export type ExtractionRedFlag = { categoryFieldId: number; triggered: boolean; reason: string };

export type ExtractSuccessResponse = {
  suggestedCategoryId: number | null;
  confidence: number | null;
  extractedFields: Record<string, string>;
  redFlags: ExtractionRedFlag[];
  rawRequestSummary: Record<string, unknown>;
  rawModelResponse: Record<string, unknown>;
};

export type ExtractErrorResponse = { error: string };

export type ExtractResponse = ExtractSuccessResponse | ExtractErrorResponse;
